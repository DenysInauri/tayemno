import type { Transporter } from "nodemailer";
import type { IRegisterRequest, IRegisterResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as usersRepo from "../../../repositories/users";
import * as pendingRepo from "../../../repositories/pendingRegistrations";
import { sendVerificationEmail } from "../../email";
import {
  generateVerificationCode,
  hashVerificationCode,
  getCodeExpirationDate,
} from "../../../utils/verification";

export const register = async (
  db: Database,
  transport: Transporter,
  smtpFrom: string,
  data: IRegisterRequest,
): Promise<IRegisterResponse> => {
  const username = data.username.toLowerCase();
  const email = data.email.toLowerCase();

  const existingUserByUsername = await usersRepo.findByUsername(db, username);
  if (existingUserByUsername) {
    throw { statusCode: 409, message: "Username is already taken" };
  }

  const existingUserByEmail = await usersRepo.findByEmail(db, email);
  if (existingUserByEmail) {
    throw { statusCode: 409, message: "Email is already registered" };
  }

  const existingPending = await pendingRepo.findByEmailOrUsername(
    db,
    email,
    username,
  );
  for (const record of existingPending) {
    await pendingRepo.deleteByEmail(db, record.email);
  }

  const code = generateVerificationCode();
  const now = new Date();

  await pendingRepo.create(db, {
    username,
    email,
    name: data.name,
    srpSalt: data.srpSalt,
    srpVerifier: data.srpVerifier,
    kdfSalt: data.kdfSalt,
    kdfAlgorithm: data.kdfAlgorithm,
    kdfMemoryKib: data.kdfMemoryKib,
    kdfIterations: data.kdfIterations,
    kdfParallelism: data.kdfParallelism,
    publicKey: data.publicKey,
    encryptedPrivateKey: data.encryptedPrivateKey,
    privateKeyNonce: data.privateKeyNonce,
    verificationCodeHash: hashVerificationCode(code),
    codeExpiresAt: getCodeExpirationDate(),
    lastSentAt: now,
  });

  await sendVerificationEmail(transport, smtpFrom, email, code);

  return { message: "Verification code sent", email };
};
