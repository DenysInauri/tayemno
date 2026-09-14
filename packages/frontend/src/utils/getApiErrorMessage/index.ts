import { AxiosError } from "axios";
import type { TFunction } from "i18next";

const ERROR_MESSAGE_TO_I18N: Record<string, string> = {
  "Username is already taken": "register.validation.usernameTaken",
  "Email is already registered": "register.validation.emailTaken",
  "Invalid verification code": "verify.validation.invalidCode",
  "Verification code has expired": "verify.validation.codeExpired",
  "Too many failed attempts. Please request a new code":
    "verify.validation.tooManyAttempts",
  "Please wait before requesting a new code":
    "verify.validation.resendCooldown",
  "No pending registration found": "verify.validation.noPendingRegistration",
};

export const getApiErrorMessage = (err: Error, t: TFunction): string => {
  if (err instanceof AxiosError) {
    const message = err.response?.data?.message;
    const i18nKey = message && ERROR_MESSAGE_TO_I18N[message];

    if (i18nKey) {
      return t(i18nKey);
    }
  }

  return t("errors.genericError");
};
