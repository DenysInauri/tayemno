import * as yup from "yup";

const USERNAME_REGEX = /^[a-z0-9._-]+$/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_SPECIAL_REGEX = /[$&+,:;=?@#|'<>.^*()%!-]/;

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
    .min(6, "register.validation.passwordMinLength")
    .matches(
      PASSWORD_NUMBER_REGEX,
      "register.validation.passwordIncludesNumber",
    )
    .matches(
      PASSWORD_LOWERCASE_REGEX,
      "register.validation.passwordIncludesLowercase",
    )
    .matches(
      PASSWORD_UPPERCASE_REGEX,
      "register.validation.passwordIncludesUppercase",
    )
    .matches(
      PASSWORD_SPECIAL_REGEX,
      "register.validation.passwordIncludesSpecial",
    ),
  confirmPassword: yup
    .string()
    .required("register.validation.confirmPasswordRequired")
    .oneOf(
      [yup.ref("password")],
      "register.validation.confirmPasswordMismatch",
    ),
});
