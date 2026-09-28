import * as yup from "yup";

export const uploadFileSchema = yup.object().shape({
  file: yup.mixed<File>().required("files.validation.fileRequired"),
});
