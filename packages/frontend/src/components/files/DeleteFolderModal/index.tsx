import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { IconCopy } from "@tabler/icons-react";

import { Modal } from "../../ui/Modal";
import { TextInput } from "../../ui/TextInput";
import { Button } from "../../ui/Button";
import { CopyButton } from "../../ui/CopyButton";
import { Stack } from "../../ui/Stack";
import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { deleteFolderConfirmSchema } from "../../../validations/deleteFolderConfirmSchema";
import { TextColorEnum } from "../../../enums/ui/TextColorEnum";

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
          <Text size="sm" c={TextColorEnum.TERTIARY}>
            {t("files.deleteFolder.descriptionPrefix")}{" "}
            <Text span c={TextColorEnum.SECONDARY} size="sm">
              {folderName}
            </Text>{" "}
            {t("files.deleteFolder.descriptionSuffix")}
          </Text>
          <Text size="sm">
            {t("files.deleteFolder.confirmPrefix")}{" "}
            <CopyButton value="delete">
              {({ copied, copy }) => (
                <Button
                  variant={copied ? undefined : "default"}
                  color={copied ? "teal" : undefined}
                  rightSection={<IconCopy size={12} />}
                  onClick={copy}
                  w={100}
                  h={22}
                >
                  {t("files.deleteFolder.confirmWord")}
                </Button>
              )}
            </CopyButton>{" "}
            {t("files.deleteFolder.confirmSuffix")}
          </Text>
          <TextInput
            name="confirm"
            placeholder={t("files.deleteFolder.placeholder")}
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
