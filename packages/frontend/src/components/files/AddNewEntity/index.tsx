import { useRef } from "react";
import type { ChangeEvent } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconPlus,
  IconUpload,
  IconFolderUp,
  IconRefresh,
} from "@tabler/icons-react";

import { Button } from "../../ui/Button";
import { Group } from "../../ui/Group";
import { ActionIcon } from "../../ui/ActionIcon";
import { CreateFolderModal } from "../CreateFolderModal";
import { usePostCreateFolder } from "../../../api/hooks/usePostCreateFolder";
import { useAuth } from "../../../contexts/AuthContext";
import { useUpload } from "../../../contexts/UploadContext";
import { useGetFolderKeyAsMember } from "../../../api/hooks/useGetFolderKeyAsMember";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

interface IProps {
  folderId: string | null;
}

export const AddNewEntity = (props: IProps) => {
  const { t } = useTranslation();
  const { workspace, user, keyPair } = useAuth();
  const { upload, uploadFolder } = useUpload();
  const queryClient = useQueryClient();
  const createFolder = usePostCreateFolder();
  const { getFolderKey } = useGetFolderKeyAsMember();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [
    folderModalOpened,
    { open: openFolderModal, close: closeFolderModal },
  ] = useDisclosure();

  const handleCreateFolder = async (name: string) => {
    if (!workspace || !user || !keyPair) return;

    const folderKey = await SymmetricCrypto.generateKey();
    const adminEncryptedKey = await AsymmetricCrypto.encrypt(
      folderKey,
      workspace.adminPublicKey,
    );
    const aclEncryptedKey = await AsymmetricCrypto.encrypt(
      folderKey,
      user.publicKey,
    );

    let wrappedKey: string | null = null;
    let wrappedKeyNonce: string | null = null;

    if (props.folderId) {
      const parentKey = await getFolderKey(props.folderId);
      const wrapped = await SymmetricCrypto.encrypt(folderKey, parentKey);
      wrappedKey = wrapped.ciphertext;
      wrappedKeyNonce = wrapped.nonce;
    }

    const encrypted = await SymmetricCrypto.encrypt(name, folderKey);

    await createFolder.mutateAsync({
      encryptedName: encrypted.ciphertext,
      nameNonce: encrypted.nonce,
      encryptedSymmetricKey: adminEncryptedKey,
      wrappedKey,
      wrappedKeyNonce,
      aclEncryptedFolderKey: aclEncryptedKey,
      parentFolderId: props.folderId,
    });

    queryClient.invalidateQueries({
      queryKey: [QueryKeyEnum.FOLDERS, workspace.id, props.folderId],
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => upload(file, props.folderId));
    e.target.value = "";
  };

  const handleFolderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    uploadFolder(files, props.folderId);
    e.target.value = "";
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: [QueryKeyEnum.FOLDERS, workspace?.id, props.folderId],
    });
    queryClient.invalidateQueries({
      queryKey: [QueryKeyEnum.VAULTS, workspace?.id, props.folderId],
    });
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
        <Button
          variant="default"
          leftSection={<IconFolderUp size={16} />}
          onClick={() => folderInputRef.current?.click()}
        >
          {t("files.uploadFolderButton")}
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

      <input
        ref={folderInputRef}
        type="file"
        onChange={handleFolderChange}
        style={{ display: "none" }}
        {...{ webkitdirectory: "", directory: "" }}
      />

      <CreateFolderModal
        opened={folderModalOpened}
        onClose={closeFolderModal}
        onSubmit={handleCreateFolder}
      />
    </>
  );
};
