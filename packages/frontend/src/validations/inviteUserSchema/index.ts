import * as yup from "yup";

export const inviteUserSchema = yup.object({
  email: yup
    .string()
    .required("users.invite.validation.emailRequired")
    .email("users.invite.validation.emailInvalid"),
  name: yup
    .string()
    .trim()
    .required("users.invite.validation.nameRequired"),
  role: yup
    .string()
    .oneOf<string>(["admin", "member", "external_member"])
    .required("users.invite.validation.roleRequired"),
});
