import { useState } from "react";

import { usePostPresignVault } from "../usePostPresignVault";
import { usePostCreateVault } from "../usePostCreateVault";
import { useGetFolders } from "../useGetFolders";
import { useAuth } from "../../../contexts/AuthContext";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";

export const useUploadVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const { dataMap: foldersById } = useGetFolders();
  const presignVault = usePostPresignVault();
  const createVault = usePostCreateVault();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File, folderId: string) => {
    if (!keyPair || !workspace || !user) return;

    const folder = foldersById[folderId];

    if (!folder) return;

    setIsUploading(true);

    try {
      const folderKey = await AsymmetricCrypto.decrypt(
        folder.encryptedSymmetricKey,
        user.publicKey,
        keyPair.privateKey,
      );

      const vaultKey = await SymmetricCrypto.generateKey();

      const { header, encryptedBlob } = await StreamCrypto.encryptFile(
        file,
        vaultKey,
      );

      const encryptedVaultKey = await SymmetricCrypto.encrypt(
        vaultKey,
        folderKey,
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
        encryptedSymmetricKey: encryptedVaultKey.ciphertext,
        symmetricKeyNonce: encryptedVaultKey.nonce,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
