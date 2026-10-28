import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDisclosure } from "@mantine/hooks";
import { Menu } from "@mantine/core";
import {
  IconArrowsMove,
  IconDotsVertical,
  IconFileZip,
  IconHistory,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { AuditActionEnum, type IFolderPermissions } from "@tayemno/shared";
import type { ILocalFolder } from "../../../types/local";

import { FileListItem } from "../FileListItem";
import { DeleteFolderModal } from "../DeleteFolderModal";
import { ActionIcon } from "../../ui/ActionIcon";
import { useDownload } from "../../../contexts/DownloadContext";
import { useDeleteFolder } from "../../../api/hooks/useDeleteFolder";
import { useMoveFolder } from "../../../api/hooks/useMoveFolder";
import { usePostAuditLog } from "../../../api/hooks/usePostAuditLog";
import { useAuth } from "../../../contexts/AuthContext";
import { RouteEnum } from "../../../enums/routing/RouteEnum";
import { AuditLogsDrawer } from "../AuditLogsDrawer";
import { ManageAccessDrawer } from "../ManageAccessDrawer";
import { MoveItemModal } from "../MoveItemModal";

interface IProps {
  folder: ILocalFolder;
  permissions: IFolderPermissions;
  currentFolderName: string;
}

export const FolderListItem = ({ folder, permissions, currentFolderName }: IProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { downloadFolder, isDownloading } = useDownload();
  const { deleteFolder, isDeleting } = useDeleteFolder(folder.id);
  const { move, isMoving } = useMoveFolder();
  const { logAction } = usePostAuditLog();
  const { workspace } = useAuth();
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure();
  const [moveModalOpened, { open: openMoveModal, close: closeMoveModal }] = useDisclosure();
  const [auditOpened, { open: openAudit, close: closeAudit }] = useDisclosure();
  const [accessOpened, { open: openAccess, close: closeAccess }] = useDisclosure();

  const handleMove = async (targetFolder: ILocalFolder | null) => {
    await move(folder, targetFolder?.id ?? null);
    logAction({ action: AuditActionEnum.FOLDER_MOVED_FROM, folder, currentFolderName, targetFolder });
    logAction({ action: AuditActionEnum.FOLDER_MOVED_TO, folder, currentFolderName, targetFolder });
    closeMoveModal();
  };

  return (
    <>
      <FileListItem
        name={folder.name}
        isFolder
        updatedAt={folder.updatedAt}
        onClick={() => navigate(RouteEnum.FOLDER.replace(":folderId", folder.id))}
        actions={
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                loading={isDownloading(folder.id) || isDeleting}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconFileZip size={16} />}
                onClick={() => downloadFolder(folder)}
              >
                {t("files.actions.downloadAsZip")}
              </Menu.Item>
              {permissions.canDelete && (
                <Menu.Item
                  leftSection={<IconArrowsMove size={14} />}
                  onClick={openMoveModal}
                >
                  {t("files.actions.move")}
                </Menu.Item>
              )}
              {permissions.canDelete && (
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={openDeleteModal}
                >
                  {t("files.actions.delete")}
                </Menu.Item>
              )}
              {(isAdmin || permissions.canManageMembers) && <Menu.Divider />}
              {isAdmin && (
                <Menu.Item leftSection={<IconHistory size={16} />} onClick={openAudit}>
                  {t("files.actions.auditLogs")}
                </Menu.Item>
              )}
              {permissions.canManageMembers && (
                <Menu.Item leftSection={<IconUsers size={16} />} onClick={openAccess}>
                  {t("files.actions.manageAccess")}
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        }
      />
      <DeleteFolderModal
        opened={deleteModalOpened}
        folderName={folder.name}
        isDeleting={isDeleting}
        onClose={closeDeleteModal}
        onConfirm={() => deleteFolder()}
      />
      <MoveItemModal
        disabledFolders={[folder.id]}
        opened={moveModalOpened}
        currentFolderId={folder.parentFolderId}
        isMoving={isMoving}
        onClose={closeMoveModal}
        onConfirm={handleMove}
      />
      <AuditLogsDrawer opened={auditOpened} onClose={closeAudit} folderId={folder.id} vaultId={null} />
      <ManageAccessDrawer opened={accessOpened} onClose={closeAccess} folderId={folder.id} permissions={permissions} />
    </>
  );
};
