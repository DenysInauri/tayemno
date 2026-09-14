import crypto from "node:crypto";

const CODE_EXPIRATION_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export const generateVerificationCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const hashVerificationCode = (code: string): string => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

export const isCodeExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

export const getCodeExpirationDate = (): Date => {
  return new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000);
};

export const canResendCode = (lastSentAt: Date): boolean => {
  const elapsed = (Date.now() - lastSentAt.getTime()) / 1000;
  return elapsed >= RESEND_COOLDOWN_SECONDS;
};

export const hasExceededAttempts = (attempts: number): boolean => {
  return attempts >= MAX_ATTEMPTS;
};
