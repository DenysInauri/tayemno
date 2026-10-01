import { useFormik } from "formik";
import { useTranslation } from "react-i18next";

import { Modal } from "../../ui/Modal";
import { TextInput } from "../../ui/TextInput";
import { Button } from "../../ui/Button";
import { Stack } from "../../ui/Stack";
import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { deleteFolderConfirmSchema } from "../../../validations/deleteFolderConfirmSchema";

interface IProps {
  opened: boolean;
  folderName: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface IDeleteFolderFormValues {
  confirm: string;
}

export const DeleteFolderModal = ({
  opened,
  folderName,
  isDeleting,
  onClose,
  onConfirm,
}: IProps) => {
  const { t } = useTranslation();

  const formik = useFormik<IDeleteFolderFormValues>({
    initialValues: { confirm: "" },
    validationSchema: deleteFolderConfirmSchema,
    validateOnChange: true,
    validateOnBlur: false,
    enableReinitialize: true,
    onSubmit: (_values, { resetForm }) => {
      onConfirm();
      resetForm();
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("files.deleteFolder.title")}
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack>
          <Text size="sm">
            {t("files.deleteFolder.description", { folderName })}
          </Text>
          <Text size="sm">
            {t("files.deleteFolder.confirmInstruction")}
          </Text>
          <TextInput
            data-autofocus
            placeholder={t("files.deleteFolder.fields.confirm.placeholder")}
            name="confirm"
            value={formik.values.confirm}
            onChange={formik.handleChange}
            error={
              formik.touched.confirm &&
              formik.errors.confirm &&
              t(formik.errors.confirm)
            }
          />
          <Group justify="space-between">
            <Button variant="default" onClick={handleClose}>
              {t("files.deleteFolder.cancel")}
            </Button>
            <Button
              type="submit"
              color="red"
              loading={isDeleting}
              disabled={formik.values.confirm.trim() !== "delete"}
            >
              {t("files.deleteFolder.submit")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
