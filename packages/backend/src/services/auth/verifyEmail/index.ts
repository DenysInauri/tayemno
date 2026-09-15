import type { IVerifyEmailRequest, ISignInUserData } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as usersRepo from "../../../repositories/users";
import * as pendingRepo from "../../../repositories/pendingRegistrations";
import {
  hashVerificationCode,
  isCodeExpired,
  hasExceededAttempts,
} from "../../../utils/verification";
import { HttpError } from "../../../utils/httpError";

export interface IVerifyEmailResult {
  message: string;
  user: ISignInUserData;
}

export const verifyEmail = async (
  db: Database,
  data: IVerifyEmailRequest,
): Promise<IVerifyEmailResult> => {
  const email = data.email.toLowerCase();
  const pending = await pendingRepo.findByEmail(db, email);

  if (!pending) {
    throw new HttpError(404, "No pending registration found");
  }

  if (isCodeExpired(pending.codeExpiresAt)) {
    throw new HttpError(410, "Verification code has expired");
  }

  if (hasExceededAttempts(pending.attempts)) {
    throw new HttpError(
      429,
      "Too many failed attempts. Please request a new code",
    );
  }

  const providedHash = hashVerificationCode(data.code);
  if (providedHash !== pending.verificationCodeHash) {
    await pendingRepo.incrementAttempts(db, pending.id);
    throw new HttpError(400, "Invalid verification code");
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

  return {
    message: "Email verified successfully",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      publicKey: user.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
      privateKeyNonce: user.privateKeyNonce,
      kdfSalt: user.kdfSalt,
      kdfAlgorithm: user.kdfAlgorithm as "argon2id",
      kdfMemoryKib: user.kdfMemoryKib,
      kdfIterations: user.kdfIterations,
      kdfParallelism: user.kdfParallelism,
    },
  };
};
