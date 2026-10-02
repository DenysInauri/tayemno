import { useRef } from "react";
import type { ChangeEvent } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconUpload, IconRefresh } from "@tabler/icons-react";

import { Button } from "../../ui/Button";
import { Group } from "../../ui/Group";
import { ActionIcon } from "../../ui/ActionIcon";
import { CreateFolderModal } from "../CreateFolderModal";
import { usePostCreateFolder } from "../../../api/hooks/usePostCreateFolder";
import { useAuth } from "../../../contexts/AuthContext";
import { useUpload } from "../../../contexts/UploadContext";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

interface IProps {
  folderId: string | null;
}

export const AddNewEntity = (props: IProps) => {
  const { t } = useTranslation();
  const { workspace, user } = useAuth();
  const { upload } = useUpload();
  const queryClient = useQueryClient();
  const createFolder = usePostCreateFolder();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [
    folderModalOpened,
    { open: openFolderModal, close: closeFolderModal },
  ] = useDisclosure();

  const handleCreateFolder = async (name: string) => {
    if (!workspace || !user) return;

    const folderKey = await SymmetricCrypto.generateKey();
    const adminEncryptedKey = await AsymmetricCrypto.encrypt(
      folderKey,
      workspace.adminPublicKey,
    );
    const memberEncryptedKey = await AsymmetricCrypto.encrypt(
      folderKey,
      user.publicKey,
    );

    createFolder.mutate({
      name,
      encryptedSymmetricKey: adminEncryptedKey,
      memberEncryptedSymmetricKey: memberEncryptedKey,
      parentFolderId: props.folderId,
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => upload(file, props.folderId));
    e.target.value = "";
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDERS] });
    queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.VAULTS] });
  };

  return (
    <>
      <Group gap="xs">
        <Button
          variant="default"
          leftSection={<IconUpload size={16} />}
          onClick={() => fileInputRef.current?.click()}
        >
          {t("files.uploadFileButton")}
        </Button>
        <Button leftSection={<IconPlus size={16} />} onClick={openFolderModal}>
          {t("files.addFolderButton")}
        </Button>
        <ActionIcon variant="default" size="input-sm" onClick={handleRefresh}>
          <IconRefresh size={16} />
        </ActionIcon>
      </Group>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <CreateFolderModal
        opened={folderModalOpened}
        onClose={closeFolderModal}
        onSubmit={handleCreateFolder}
      />
    </>
  );
};
