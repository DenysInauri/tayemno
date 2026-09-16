import * as yup from "yup";

export const createFolderSchema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required("files.validation.folderNameRequired"),
});
