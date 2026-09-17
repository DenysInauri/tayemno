import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { Menu } from "@mantine/core";
import { IconPlus, IconFolder, IconUpload } from "@tabler/icons-react";

import { Button } from "../../ui/Button";
import { CreateFolderModal } from "../CreateFolderModal";
import { UploadFileModal } from "../UploadFileModal";
import { usePostCreateFolder } from "../../../api/hooks/usePostCreateFolder";
import { useAuth } from "../../../contexts/AuthContext";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";

interface IProps {
  folderId: string | null;
}

export const AddNewEntity = (props: IProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const createFolder = usePostCreateFolder();
  const [
    folderModalOpened,
    { open: openFolderModal, close: closeFolderModal },
  ] = useDisclosure();
  const [fileModalOpened, { open: openFileModal, close: closeFileModal }] =
    useDisclosure();

  const handleCreateFolder = async (name: string) => {
    if (!user) return;

    const folderKey = await SymmetricCrypto.generateKey();
    const encryptedKey = await AsymmetricCrypto.encrypt(
      folderKey,
      user.publicKey,
    );

    createFolder.mutate({ name, symmetricKey: encryptedKey });
  };

  return (
    <>
      <Menu position="bottom-end">
        <Menu.Target>
          <Button leftSection={<IconPlus size={16} />}>
            {t("files.addNew")}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {!props.folderId && (
            <Menu.Item
              leftSection={<IconFolder size={16} />}
              onClick={openFolderModal}
            >
              {t("files.menu.folder")}
            </Menu.Item>
          )}
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
        onSubmit={handleCreateFolder}
      />
      <UploadFileModal opened={fileModalOpened} onClose={closeFileModal} />
    </>
  );
};
