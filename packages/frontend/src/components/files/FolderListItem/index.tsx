import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDisclosure } from "@mantine/hooks";
import { Menu } from "@mantine/core";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import type { Folder } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { DeleteFolderModal } from "../DeleteFolderModal";
import { ActionIcon } from "../../ui/ActionIcon";
import { useGetFolderSize } from "../../../api/hooks/useGetFolderSize";
import { useDeleteFolder } from "../../../api/hooks/useDeleteFolder";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

interface IProps {
  folder: Folder;
}

export const FolderListItem = ({ folder }: IProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useGetFolderSize(folder.id);
  const { deleteFolder, isDeleting } = useDeleteFolder(folder.id);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure();

  return (
    <>
      <FileListItem
        name={folder.name}
        isFolder
        sizeBytes={data?.sizeBytes}
        encryptedSizeBytes={data?.encryptedSizeBytes}
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
                loading={isDeleting}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
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
    </>
  );
};
