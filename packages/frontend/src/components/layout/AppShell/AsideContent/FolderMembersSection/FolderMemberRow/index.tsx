import { Table, Menu, Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IconDotsVertical, IconUserMinus } from "@tabler/icons-react";
import type { IFolderMemberItem } from "@tayemno/shared";
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
  ancestor?: IDecryptedAncestor;
  onRevoke: (member: IFolderMemberItem) => void;
}

export const FolderMemberRow = ({
  member,
  isCurrentUser,
  ancestor,
  onRevoke,
}: IProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
            </Group>
            <Group gap={4} wrap="nowrap" className={classes.detailsGroup}>
              <Text size="xs" c="dimmed" truncate>
                {member.email}
              </Text>
              {member.inherited && ancestor && (
                <>
                  <Text size="xs" c="dimmed">
                    ·
                  </Text>
                  <Text size="xs" c="dimmed" className={classes.noWrapText}>
                    {t("aside.members.accessThrough")}
                  </Text>
                  <Anchor
                    size="xs"
                    component="button"
                    type="button"
                    onClick={() =>
                      navigate(
                        RouteEnum.FOLDER.replace(":folderId", ancestor.folderId),
                      )
                    }
                    truncate
                  >
                    {ancestor.name}
                  </Anchor>
                </>
              )}
            </Group>
          </Stack>
          {!isCurrentUser && (
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
