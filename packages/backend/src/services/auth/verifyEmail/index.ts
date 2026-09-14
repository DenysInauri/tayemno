import type { IVerifyEmailRequest, IVerifyEmailResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as usersRepo from "../../../repositories/users";
import * as pendingRepo from "../../../repositories/pendingRegistrations";
import {
  hashVerificationCode,
  isCodeExpired,
  hasExceededAttempts,
} from "../../../utils/verification";

export const verifyEmail = async (
  db: Database,
  data: IVerifyEmailRequest,
): Promise<IVerifyEmailResponse> => {
  const email = data.email.toLowerCase();
  const pending = await pendingRepo.findByEmail(db, email);

  if (!pending) {
    throw { statusCode: 404, message: "No pending registration found" };
  }

  if (isCodeExpired(pending.codeExpiresAt)) {
    throw { statusCode: 410, message: "Verification code has expired" };
  }

  if (hasExceededAttempts(pending.attempts)) {
    throw {
      statusCode: 429,
      message: "Too many failed attempts. Please request a new code",
    };
  }

  const providedHash = hashVerificationCode(data.code);
  if (providedHash !== pending.verificationCodeHash) {
    await pendingRepo.incrementAttempts(db, pending.id);
    throw { statusCode: 400, message: "Invalid verification code" };
  }

  const user = await usersRepo.create(db, {
    username: pending.username,
    email: pending.email,
    emailVerified: true,
    name: pending.name,
    srpSalt: pending.srpSalt,
    srpVerifier: pending.srpVerifier,
    kdfSalt: pending.kdfSalt,
    kdfAlgorithm: pending.kdfAlgorithm,
    kdfMemoryKib: pending.kdfMemoryKib,
    kdfIterations: pending.kdfIterations,
    kdfParallelism: pending.kdfParallelism,
    publicKey: pending.publicKey,
    encryptedPrivateKey: pending.encryptedPrivateKey,
    privateKeyNonce: pending.privateKeyNonce,
  });

  await pendingRepo.deleteByEmail(db, email);

  return { message: "Email verified successfully", userId: user.id };
};
