import * as yup from "yup";

const USERNAME_REGEX = /^[a-z0-9._-]+$/;

export const registerSchema = yup.object().shape({
  name: yup.string().trim().required("register.validation.nameRequired"),
  username: yup
    .string()
    .trim()
    .required("register.validation.usernameRequired")
    .min(3, "register.validation.usernameMinLength")
    .matches(USERNAME_REGEX, "register.validation.usernameInvalidFormat")
    .test(
      "no-special-edges",
      "register.validation.usernameInvalidEdges",
      (value) => {
        if (!value) return true;
        return !/^[._-]|[._-]$/.test(value);
      },
    ),
  email: yup
    .string()
    .trim()
    .required("register.validation.emailRequired")
    .email("register.validation.emailInvalid"),
  password: yup
    .string()
    .required("register.validation.passwordRequired")
    .min(8, "register.validation.passwordMinLength"),
  confirmPassword: yup
    .string()
    .required("register.validation.confirmPasswordRequired")
    .oneOf(
      [yup.ref("password")],
      "register.validation.confirmPasswordMismatch",
    ),
});
