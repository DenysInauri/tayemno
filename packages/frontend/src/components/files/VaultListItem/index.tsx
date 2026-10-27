import { useTranslation } from "react-i18next";
import { useDisclosure } from "@mantine/hooks";
import { Menu } from "@mantine/core";
import {
  IconDotsVertical,
  IconDownload,
  IconFolderSymlink,
  IconTrash,
} from "@tabler/icons-react";
import { AuditActionEnum, type IFolderPermissions } from "@tayemno/shared";
import type { ILocalFolder, ILocalVault } from "../../../types/local";

import { FileListItem } from "../FileListItem";
import { MoveItemModal } from "../MoveItemModal";
import { ActionIcon } from "../../ui/ActionIcon";
import { useDownload } from "../../../contexts/DownloadContext";
import { useDeleteVault } from "../../../api/hooks/useDeleteVault";
import { useMoveVault } from "../../../api/hooks/useMoveVault";
import { usePostAuditLog } from "../../../api/hooks/usePostAuditLog";
import { useThumbnail } from "../../../hooks/useThumbnail";

interface IProps {
  vault: ILocalVault;
  permissions: IFolderPermissions;
  onPreview: (vault: ILocalVault) => void;
  selected?: boolean;
  onSelect: () => void;
  currentFolderName: string;
}

export const VaultListItem = ({ vault, permissions, onPreview, selected, onSelect, currentFolderName }: IProps) => {
  const { t } = useTranslation();
  const thumbnailUrl = useThumbnail(vault);
  const { download, isDownloading } = useDownload();
  const { deleteVault, isDeleting } = useDeleteVault(vault.id);
  const { move, isMoving } = useMoveVault();
  const { logAction } = usePostAuditLog();
  const [moveModalOpened, { open: openMoveModal, close: closeMoveModal }] =
    useDisclosure();

  const handleMove = async (targetFolder: ILocalFolder | null) => {
    await move(vault, targetFolder?.id ?? null);
    logAction({ action: AuditActionEnum.VAULT_MOVED_FROM, vault, currentFolderName, targetFolder });
    logAction({ action: AuditActionEnum.VAULT_MOVED_TO, vault, currentFolderName, targetFolder });
    closeMoveModal();
  };

  const handleDelete = async () => {
    await deleteVault();
    logAction({ action: AuditActionEnum.VAULT_DELETED, vault });
  };

  const handleDownload = () => download(vault);

  return (
    <>
      <FileListItem
        name={vault.name}
        isFolder={false}
        sizeBytes={vault.sizeBytes}
        updatedAt={vault.updatedAt}
        thumbnailUrl={thumbnailUrl}
        selected={selected}
        onClick={onSelect}
        onDoubleClick={() => onPreview(vault)}
        actions={
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                loading={isDownloading(vault.id) || isDeleting}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconDownload size={16} />}
                onClick={handleDownload}
              >
                {t("files.actions.download")}
              </Menu.Item>
              {permissions.canDelete && (
                <Menu.Item
                  leftSection={<IconFolderSymlink size={16} />}
                  onClick={openMoveModal}
                >
                  {t("files.actions.move")}
                </Menu.Item>
              )}
              {permissions.canDelete && (
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={handleDelete}
                >
                  {t("files.actions.delete")}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        }
      />
      <MoveItemModal
        opened={moveModalOpened}
        currentFolderId={vault.folderId}
        isMoving={isMoving}
        onClose={closeMoveModal}
        onConfirm={handleMove}
      />
    </>
  );
};
