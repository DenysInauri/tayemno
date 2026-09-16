import { useTranslation } from "react-i18next";

import { Modal } from "../../ui/Modal";
import { Text } from "../../ui/Text";

interface IProps {
  opened: boolean;
  onClose: () => void;
}

export const UploadFileModal = ({ opened, onClose }: IProps) => {
  const { t } = useTranslation();

  return (
    <Modal opened={opened} onClose={onClose} title={t("files.uploadFile.title")}>
      <Text c="dimmed">{t("files.uploadFile.placeholder")}</Text>
    </Modal>
  );
};
