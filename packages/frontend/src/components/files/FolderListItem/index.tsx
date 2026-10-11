import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDisclosure } from "@mantine/hooks";
import { Menu } from "@mantine/core";
import {
  IconArrowsMove,
  IconDotsVertical,
  IconFileZip,
  IconTrash,
} from "@tabler/icons-react";
import type { ILocalFolder } from "../../../types/local";

import { FileListItem } from "../FileListItem";
import { DeleteFolderModal } from "../DeleteFolderModal";
import { ActionIcon } from "../../ui/ActionIcon";
import { useDownload } from "../../../contexts/DownloadContext";
import { useDeleteFolder } from "../../../api/hooks/useDeleteFolder";
import { useMoveFolder } from "../../../api/hooks/useMoveFolder";
import { RouteEnum } from "../../../enums/routing/RouteEnum";
import { MoveItemModal } from "../MoveItemModal";

interface IProps {
  folder: ILocalFolder;
}

export const FolderListItem = ({ folder }: IProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { downloadFolder, isDownloading } = useDownload();
  const { deleteFolder, isDeleting } = useDeleteFolder(folder.id);
  const { move, isMoving } = useMoveFolder();
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure();
  const [moveModalOpened, { open: openMoveModal, close: closeMoveModal }] =
    useDisclosure();

  const handleMove = async (targetFolderId: string | null) => {
    await move(folder, targetFolderId);
    closeMoveModal();
  };

  return (
    <>
      <FileListItem
        name={folder.name}
        isFolder
        updatedAt={folder.updatedAt}
        onClick={() =>
          navigate(RouteEnum.FOLDER.replace(":folderId", folder.id))
        }
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
              <Menu.Item
                leftSection={<IconArrowsMove size={14} />}
                onClick={openMoveModal}
              >
                {t("files.actions.move")}
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={openDeleteModal}
              >
                {t("files.actions.delete")}
              </Menu.Item>
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
    </>
  );
};
