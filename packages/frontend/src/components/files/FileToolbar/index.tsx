import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconSearch } from "@tabler/icons-react";
import type { IFolderPermissions } from "@tayemno/shared";

import { Group } from "../../ui/Group";
import { TextInput } from "../../ui/TextInput";
import { AddNewEntity } from "../AddNewEntity";

interface IProps {
  folderId: string | null;
  permissions: IFolderPermissions;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const FileToolbar = ({ folderId, permissions, searchQuery, onSearchChange }: IProps) => {
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
      <AddNewEntity folderId={folderId} permissions={permissions} />
    </Group>
  );
};
