import { Table, Menu, Badge, NativeSelect } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IconDotsVertical, IconUserMinus } from "@tabler/icons-react";
import type { IFolderMemberItem, FolderRole } from "@tayemno/shared";
import type { IDecryptedAncestor } from "../../../../../../api/hooks/useDecryptAncestorFolderNames";
import { ActionIcon } from "../../../../../ui/ActionIcon";
import { Anchor } from "../../../../../ui/Anchor";
import { Text } from "../../../../../ui/Text";
import { Group } from "../../../../../ui/Group";
import { Stack } from "../../../../../ui/Stack";
import { RouteEnum } from "../../../../../../enums/routing/RouteEnum";
import classes from "./index.module.css";

interface IProps {
  member: IFolderMemberItem;
  isCurrentUser: boolean;
  canManageMembers: boolean;
  isAdmin: boolean;
  folderId: string;
  ancestor?: IDecryptedAncestor;
  onRevoke: (member: IFolderMemberItem) => void;
  onRoleChange: (member: IFolderMemberItem, role: FolderRole) => void;
}

export const FolderMemberRow = ({
  member,
  isCurrentUser,
  canManageMembers,
  isAdmin,
  ancestor,
  onRevoke,
  onRoleChange,
}: IProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isMemberAdmin = member.workspaceRole === "owner" || member.workspaceRole === "admin";

  const roleOptions = [
    { value: "viewer", label: t("files.roles.viewer") },
    { value: "editor", label: t("files.roles.editor") },
    ...(isAdmin ? [{ value: "manager", label: t("files.roles.manager") }] : []),
  ];

  const isDropdownDisabled = !canManageMembers || member.inherited || isCurrentUser;

  return (
    <Table.Tr>
      <Table.Td className={classes.cell}>
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={2} className={classes.nameStack}>
            <Group gap={4} wrap="nowrap">
              <Text size="sm" fw={500} truncate>
                {member.name}
              </Text>
              {isCurrentUser && (
                <Badge variant="light" size="xs">
                  {t("aside.members.you")}
                </Badge>
              )}
              {canManageMembers && !isMemberAdmin ? (
                <NativeSelect
                  size="xs"
                  data={roleOptions}
                  value={member.role}
                  onChange={(e) => onRoleChange(member, e.currentTarget.value as FolderRole)}
                  disabled={isDropdownDisabled}
                  className={classes.roleSelect}
                />
              ) : (
                <Badge variant={isMemberAdmin ? "light" : "outline"} size="xs">
                  {isMemberAdmin ? t(`members.roles.${member.workspaceRole}`) : t(`files.roles.${member.role}`)}
                </Badge>
              )}
            </Group>
            <Group gap={4} wrap="nowrap" className={classes.detailsGroup}>
              <Text size="xs" c="dimmed" truncate>
                {member.email}
              </Text>
              {member.inherited && ancestor && (
                <>
                  <Text size="xs" c="dimmed">·</Text>
                  <Text size="xs" c="dimmed" className={classes.noWrapText}>
                    {t("aside.members.accessThrough")}
                  </Text>
                  <Anchor
                    size="xs"
                    component="button"
                    type="button"
                    onClick={() =>
                      navigate(RouteEnum.FOLDER.replace(":folderId", ancestor.folderId))
                    }
                    truncate
                  >
                    {ancestor.name}
                  </Anchor>
                </>
              )}
            </Group>
          </Stack>
          {!isCurrentUser && canManageMembers && (
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
                  disabled={member.inherited}
                >
                  {t("aside.members.actions.revoke")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
};
