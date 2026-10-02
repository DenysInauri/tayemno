import { useTranslation } from "react-i18next";
import { useDisclosure } from "@mantine/hooks";
import { Menu } from "@mantine/core";
import {
  IconDotsVertical,
  IconDownload,
  IconFolderSymlink,
  IconTrash,
} from "@tabler/icons-react";
import type { Vault } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { MoveVaultModal } from "../MoveVaultModal";
import { ActionIcon } from "../../ui/ActionIcon";
import { useDownload } from "../../../contexts/DownloadContext";
import { useDeleteVault } from "../../../api/hooks/useDeleteVault";
import { useMoveVault } from "../../../api/hooks/useMoveVault";
import { useGetFolderTree } from "../../../api/hooks/useGetFolderTree";

interface IProps {
  vault: Vault;
}

export const VaultListItem = ({ vault }: IProps) => {
  const { t } = useTranslation();
  const { download, isDownloading } = useDownload();
  const { deleteVault, isDeleting } = useDeleteVault(vault.id);
  const { move, isMoving } = useMoveVault();
  const [moveModalOpened, { open: openMoveModal, close: closeMoveModal }] =
    useDisclosure();
  const { data: folderTree, isLoading: isLoadingTree } = useGetFolderTree(
    moveModalOpened,
  );

  const handleMove = async (targetFolderId: string | null) => {
    await move(vault, targetFolderId);
    closeMoveModal();
  };

  return (
    <>
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
              <ActionIcon
                variant="subtle"
                color="gray"
                loading={isDownloading(vault.id) || isDeleting || isLoadingTree}
              >
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
              <Menu.Item
                leftSection={<IconFolderSymlink size={16} />}
                onClick={openMoveModal}
              >
                {t("files.actions.move")}
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => deleteVault()}
              >
                {t("files.actions.delete")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />
      <MoveVaultModal
        opened={moveModalOpened}
        currentFolderId={vault.folderId}
        folderTree={folderTree}
        isMoving={isMoving}
        onClose={closeMoveModal}
        onConfirm={handleMove}
      />
    </>
  );
};
