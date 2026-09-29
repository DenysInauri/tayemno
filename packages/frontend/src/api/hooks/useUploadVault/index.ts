import { useState } from "react";
import type { IGetFolderResponse } from "@tayemno/shared";

import { usePostPresignVault } from "../usePostPresignVault";
import { usePostCreateVault } from "../usePostCreateVault";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { axios } from "../../axios";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";

export const useUploadVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const presignVault = usePostPresignVault();
  const createVault = usePostCreateVault();
  const [isUploading, setIsUploading] = useState(false);

  const buildVaultEncryptionKey = async (folderId: string | null) => {
    if (!keyPair || !workspace || !user) return null;

    const vaultKey = await SymmetricCrypto.generateKey();

    if (folderId) {
      const { data } = await axios.get<IGetFolderResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace.id}/folders/${folderId}`,
      );
      const folder = data.folder;

      const folderKey = await AsymmetricCrypto.decrypt(
        folder.encryptedSymmetricKey,
        user.publicKey,
        keyPair.privateKey,
      );

      const encryptedVaultKey = await SymmetricCrypto.encrypt(
        vaultKey,
        folderKey,
      );

      return {
        symmetricKey: vaultKey,
        encryptedSymmetricKey: encryptedVaultKey.ciphertext,
        symmetricKeyNonce: encryptedVaultKey.nonce,
      };
    }

    const encryptedSymmetricKey = await AsymmetricCrypto.encrypt(
      vaultKey,
      workspace.memberPublicKey,
    );

    return {
      encryptedSymmetricKey,
      symmetricKeyNonce: null,
      symmetricKey: vaultKey,
    };
  };

  const upload = async (file: File, folderId: string | null) => {
    if (!keyPair || !workspace || !user) return;

    setIsUploading(true);

    try {
      const buildVaultEncryptionKeyResult =
        await buildVaultEncryptionKey(folderId);

      if (!buildVaultEncryptionKeyResult) return;

      const { encryptedSymmetricKey, symmetricKeyNonce, symmetricKey } =
        buildVaultEncryptionKeyResult;

      const { header, encryptedBlob } = await StreamCrypto.encryptFile(
        file,
        symmetricKey,
      );

      const fileName = file.name;
      const extension = fileName.includes(".")
        ? fileName.split(".").pop()!
        : "";
      const mimeType = file.type || "application/octet-stream";

      const presignResult = await presignVault.mutateAsync({
        workspaceId: workspace.id,
        folderId,
        fileName,
        mimeType,
      });

      await fetch(presignResult.presignedUrl, {
        method: "PUT",
        body: encryptedBlob,
        headers: { "Content-Type": "application/octet-stream" },
      });

      await createVault.mutateAsync({
        workspaceId: workspace.id,
        folderId,
        name: fileName,
        mimeType,
        extension,
        sizeBytes: encryptedBlob.size,
        s3Key: presignResult.s3Key,
        contentNonce: header,
        encryptedSymmetricKey,
        symmetricKeyNonce,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
