import { useTranslation } from "react-i18next";
import { Menu } from "@mantine/core";
import { IconDotsVertical, IconSend, IconTrash } from "@tabler/icons-react";
import type { IMemberItem } from "@tayemno/shared";
import { ActionIcon } from "../../../../components/ui/ActionIcon";

interface IProps {
  member: IMemberItem;
  currentUserId: string;
  onReinvite: (member: IMemberItem) => void;
  onDelete: (member: IMemberItem) => void;
}

export const MemberRowActions = ({
  member,
  currentUserId,
  onReinvite,
  onDelete,
}: IProps) => {
  const { t } = useTranslation();

  const canReinvite = member.status === "invited";
  const canDelete = member.role !== "owner" && member.userId !== currentUserId;

  if (!canReinvite && !canDelete) return null;

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray">
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {canReinvite && (
          <Menu.Item
            leftSection={<IconSend size={16} />}
            onClick={() => onReinvite(member)}
          >
            {t("users.actions.reinvite")}
          </Menu.Item>
        )}
        {canDelete && (
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => onDelete(member)}
          >
            {t("users.actions.delete")}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};
