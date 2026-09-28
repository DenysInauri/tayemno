import { useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { FileInput } from "@mantine/core";

import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { useUploadVault } from "../../../api/hooks/useUploadVault";
import { uploadFileSchema } from "../../../validations/uploadFileSchema";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";

interface IProps {
  opened: boolean;
  onClose: () => void;
  folderId: string;
}

interface IUploadFileFormValues {
  file: File | null;
}

export const UploadFileModal = ({ opened, onClose, folderId }: IProps) => {
  const { t } = useTranslation();
  const { upload, isUploading } = useUploadVault();
  const [uploadError, setUploadError] = useState("");

  const formik = useFormik<IUploadFileFormValues>({
    initialValues: { file: null },
    validationSchema: uploadFileSchema,
    validateOnChange: true,
    validateOnBlur: false,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      if (!values.file) return;

      setUploadError("");

      try {
        await upload(values.file, folderId);
        resetForm();
        onClose();
      } catch (err: any) {
        setUploadError(getApiErrorMessage(err, t));
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    setUploadError("");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("files.uploadFile.title")}
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack>
          <FileInput
            label={t("files.uploadFile.fields.file.label")}
            placeholder={t("files.uploadFile.fields.file.placeholder")}
            value={formik.values.file}
            onChange={(file) => formik.setFieldValue("file", file)}
            error={
              formik.touched.file &&
              formik.errors.file &&
              t(formik.errors.file)
            }
          />
          {uploadError && (
            <Text c="red" size="sm" ta="center">
              {uploadError}
            </Text>
          )}
          <Button type="submit" fullWidth loading={isUploading}>
            {t("files.uploadFile.submit")}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
};
