import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@mantine/core";
import { IconSearch, IconSettings } from "@tabler/icons-react";
import type { IFolderPermissions } from "@tayemno/shared";

import { Group } from "../../ui/Group";
import { TextInput } from "../../ui/TextInput";
import { ActionIcon } from "../../ui/ActionIcon";
import { AddNewEntity } from "../AddNewEntity";

interface IProps {
  folderId: string | null;
  permissions: IFolderPermissions;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSettingsClick?: () => void;
}

export const FileToolbar = ({ folderId, permissions, searchQuery, onSearchChange, onSettingsClick }: IProps) => {
  const { t } = useTranslation();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.currentTarget.value);
  };

  return (
    <Group justify="space-between">
      <TextInput
        placeholder={t("files.search.placeholder")}
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={handleChange}
      />
      <Group gap="xs">
        <AddNewEntity folderId={folderId} permissions={permissions} />
        {onSettingsClick && (
          <Tooltip label={t("aside.settingsButton")}>
            <ActionIcon variant="default" size="input-sm" onClick={onSettingsClick}>
              <IconSettings size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Group>
  );
};
