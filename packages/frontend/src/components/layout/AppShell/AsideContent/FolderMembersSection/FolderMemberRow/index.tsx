import { Table, Menu, Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconDotsVertical, IconUserMinus } from "@tabler/icons-react";
import type { IFolderMemberItem } from "@tayemno/shared";
import { ActionIcon } from "../../../../../ui/ActionIcon";

interface IProps {
  member: IFolderMemberItem;
  isCurrentUser: boolean;
  onRevoke: (member: IFolderMemberItem) => void;
}

export const FolderMemberRow = ({
  member,
  isCurrentUser,
  onRevoke,
}: IProps) => {
  const { t } = useTranslation();

  return (
    <Table.Tr>
      <Table.Td>{member.name}</Table.Td>
      <Table.Td>{member.email}</Table.Td>
      <Table.Td style={{ textAlign: "right" }}>
        {isCurrentUser ? (
          <Badge variant="light" size="sm">
            {t("aside.members.you")}
          </Badge>
        ) : (
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                leftSection={<IconUserMinus size={16} />}
                onClick={() => onRevoke(member)}
              >
                {t("aside.members.actions.revoke")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  );
};
