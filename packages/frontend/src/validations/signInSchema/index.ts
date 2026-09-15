import * as Yup from "yup";

export const signInSchema = Yup.object().shape({
  identifier: Yup.string().required("signIn.validation.identifierRequired"),
  password: Yup.string().required("signIn.validation.passwordRequired"),
});
