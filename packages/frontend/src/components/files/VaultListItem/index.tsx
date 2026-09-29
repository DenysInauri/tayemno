import { useTranslation } from "react-i18next";
import { Menu } from "@mantine/core";
import { IconDotsVertical, IconDownload } from "@tabler/icons-react";
import type { Vault } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { ActionIcon } from "../../ui/ActionIcon";
import { useDownloadVault } from "../../../api/hooks/useDownloadVault";

interface IProps {
  vault: Vault;
}

export const VaultListItem = ({ vault }: IProps) => {
  const { t } = useTranslation();
  const { download, isDownloading } = useDownloadVault();

  return (
    <FileListItem
      name={vault.name}
      isFolder={false}
      sizeBytes={vault.sizeBytes}
      encryptedSizeBytes={vault.encryptedSizeBytes}
      updatedAt={vault.updatedAt}
      onClick={() => {}}
      actions={
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" loading={isDownloading}>
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconDownload size={16} />}
              onClick={() => download(vault)}
            >
              {t("files.actions.download")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      }
    />
  );
};
