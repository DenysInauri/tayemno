import type { Transporter } from "nodemailer";
import type {
  IResendVerificationRequest,
  IResendVerificationResponse,
} from "@tayemno/shared";
import type { Database } from "../../../db";
import * as pendingRepo from "../../../repositories/pendingRegistrations";
import { sendVerificationEmail } from "../../email";
import {
  generateVerificationCode,
  hashVerificationCode,
  getCodeExpirationDate,
  canResendCode,
} from "../../../utils/verification";

export const resendVerification = async (
  db: Database,
  transport: Transporter,
  smtpFrom: string,
  data: IResendVerificationRequest,
): Promise<IResendVerificationResponse> => {
  const email = data.email.toLowerCase();
  const pending = await pendingRepo.findByEmail(db, email);

  if (!pending) {
    throw { statusCode: 404, message: "No pending registration found" };
  }

  if (!canResendCode(pending.lastSentAt)) {
    throw {
      statusCode: 429,
      message: "Please wait before requesting a new code",
    };
  }

  const code = generateVerificationCode();
  const now = new Date();

  await pendingRepo.updateVerificationCode(
    db,
    pending.id,
    hashVerificationCode(code),
    getCodeExpirationDate(),
    now,
  );

  await sendVerificationEmail(transport, smtpFrom, email, code);

  return { message: "Verification code resent" };
};
