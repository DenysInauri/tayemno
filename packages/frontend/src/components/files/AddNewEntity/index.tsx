import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { Menu } from "@mantine/core";
import { IconPlus, IconFolder, IconUpload } from "@tabler/icons-react";

import { Button } from "../../ui/Button";
import { CreateFolderModal } from "../CreateFolderModal";
import { UploadFileModal } from "../UploadFileModal";

export const AddNewEntity = () => {
  const { t } = useTranslation();
  const [folderModalOpened, { open: openFolderModal, close: closeFolderModal }] =
    useDisclosure();
  const [fileModalOpened, { open: openFileModal, close: closeFileModal }] =
    useDisclosure();

  return (
    <>
      <Menu position="bottom-end">
        <Menu.Target>
          <Button leftSection={<IconPlus size={16} />}>
            {t("files.addNew")}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconFolder size={16} />}
            onClick={openFolderModal}
          >
            {t("files.menu.folder")}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconUpload size={16} />}
            onClick={openFileModal}
          >
            {t("files.menu.file")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <CreateFolderModal
        opened={folderModalOpened}
        onClose={closeFolderModal}
        onSubmit={(name) => console.log("Create folder:", name)}
      />
      <UploadFileModal opened={fileModalOpened} onClose={closeFileModal} />
    </>
  );
};
