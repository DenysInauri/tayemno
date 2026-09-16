import { useFormik } from "formik";
import { useTranslation } from "react-i18next";

import { Modal } from "../../ui/Modal";
import { TextInput } from "../../ui/TextInput";
import { Button } from "../../ui/Button";
import { Stack } from "../../ui/Stack";
import { createFolderSchema } from "../../../validations/createFolderSchema";

interface IProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

interface ICreateFolderFormValues {
  name: string;
}

export const CreateFolderModal = ({ opened, onClose, onSubmit }: IProps) => {
  const { t } = useTranslation();

  const formik = useFormik<ICreateFolderFormValues>({
    initialValues: { name: "" },
    validationSchema: createFolderSchema,
    validateOnChange: true,
    validateOnBlur: false,
    enableReinitialize: true,
    onSubmit: (values, { resetForm }) => {
      onSubmit(values.name.trim());
      resetForm();
      onClose();
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  const handleBlur = (fieldName: string) => () => {
    formik.setFieldTouched(fieldName, true);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("files.createFolder.title")}
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack>
          <TextInput
            label={t("files.createFolder.fields.name.label")}
            placeholder={t("files.createFolder.fields.name.placeholder")}
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={handleBlur("name")}
            maxLength={255}
            error={
              formik.touched.name && formik.errors.name && t(formik.errors.name)
            }
          />
          <Button type="submit" fullWidth>
            {t("files.createFolder.submit")}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
};
