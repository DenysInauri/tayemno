import * as yup from "yup";

const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_SPECIAL_REGEX = /[$&+,:;=?@#|'<>.^*()%!-]/;

export const changePasswordSchema = yup.object({
  password: yup
    .string()
    .required("changePassword.validation.passwordRequired")
    .min(6, "changePassword.validation.passwordMinLength")
    .matches(
      PASSWORD_NUMBER_REGEX,
      "changePassword.validation.passwordIncludesNumber",
    )
    .matches(
      PASSWORD_LOWERCASE_REGEX,
      "changePassword.validation.passwordIncludesLowercase",
    )
    .matches(
      PASSWORD_UPPERCASE_REGEX,
      "changePassword.validation.passwordIncludesUppercase",
    )
    .matches(
      PASSWORD_SPECIAL_REGEX,
      "changePassword.validation.passwordIncludesSpecial",
    ),
  confirmPassword: yup
    .string()
    .required("changePassword.validation.confirmPasswordRequired")
    .oneOf(
      [yup.ref("password")],
      "changePassword.validation.confirmPasswordMismatch",
    ),
});
