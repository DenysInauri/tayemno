import { useState } from "react";

import { usePostPresignVault } from "../usePostPresignVault";
import { usePostCreateVault } from "../usePostCreateVault";
import { useAuth } from "../../../contexts/AuthContext";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";
import { getFolderKey } from "../../../services/folderKeyService";

export const useUploadVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const presignVault = usePostPresignVault();
  const createVault = usePostCreateVault();
  const [isUploading, setIsUploading] = useState(false);

  const buildVaultEncryptionKey = async (folderId: string | null) => {
    if (!keyPair || !workspace || !user) return null;

    const vaultKey = await SymmetricCrypto.generateKey();

    if (folderId) {
      const folderKey = await getFolderKey(
        folderId,
        workspace.id,
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
        sizeBytes: file.size,
        encryptedSizeBytes: encryptedBlob.size,
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
