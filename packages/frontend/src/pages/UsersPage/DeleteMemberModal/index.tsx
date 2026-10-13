import { useTranslation } from "react-i18next";
import type { IMemberItem } from "@tayemno/shared";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Stack } from "../../../components/ui/Stack";
import { Group } from "../../../components/ui/Group";
import { Text } from "../../../components/ui/Text";

interface IDeleteMemberModalProps {
  opened: boolean;
  member: IMemberItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteMemberModal = ({
  opened,
  member,
  isDeleting,
  onClose,
  onConfirm,
}: IDeleteMemberModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal opened={opened} onClose={onClose} title={t("users.delete.title")}>
      <Stack>
        <Text size="sm">{t("users.delete.description")}</Text>
        {member && (
          <Text size="sm" fw={600}>
            {member.name} ({member.email})
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("users.delete.cancel")}
          </Button>
          <Button color="red" loading={isDeleting} onClick={onConfirm}>
            {t("users.delete.confirm")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
