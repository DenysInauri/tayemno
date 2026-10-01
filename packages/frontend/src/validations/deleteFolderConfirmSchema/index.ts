import * as yup from "yup";

export const deleteFolderConfirmSchema = yup.object().shape({
  confirm: yup
    .string()
    .trim()
    .required("files.deleteFolder.validation.confirmRequired")
    .oneOf(["delete"], "files.deleteFolder.validation.confirmMismatch"),
});
