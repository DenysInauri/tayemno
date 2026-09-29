import { useState } from "react";
import type { Vault } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { getFolderKey } from "../../../services/folderKeyService";
import { downloadBlob } from "../../../utils/downloadBlob";

export const useDownloadVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  const decryptVaultKey = async (vault: Vault): Promise<string> => {
    if (!keyPair || !workspace || !user) {
      throw new Error("Not authenticated");
    }

    if (vault.folderId && vault.symmetricKeyNonce) {
      const folderKey = await getFolderKey(
        vault.folderId,
        workspace.id,
        user.publicKey,
        keyPair.privateKey,
      );

      return SymmetricCrypto.decrypt(
        { nonce: vault.symmetricKeyNonce, ciphertext: vault.encryptedSymmetricKey },
        folderKey,
      );
    }

    const memberPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedMemberPrivateKey,
      user.publicKey,
      keyPair.privateKey,
    );

    return AsymmetricCrypto.decrypt(
      vault.encryptedSymmetricKey,
      workspace.memberPublicKey,
      memberPrivateKey,
    );
  };

  const download = async (vault: Vault) => {
    if (!keyPair || !workspace || !user) return;

    setIsDownloading(true);

    try {
      const { data } = await axios.get<{ presignedUrl: string }>(
        `${EndpointEnum.VAULTS}/${vault.id}/download-url`,
      );

      const response = await fetch(data.presignedUrl);
      const encryptedBlob = await response.blob();

      const vaultKey = await decryptVaultKey(vault);

      const decryptedBlob = await StreamCrypto.decryptFile(
        encryptedBlob,
        vaultKey,
        vault.contentNonce,
      );

      downloadBlob(decryptedBlob, vault.name, vault.mimeType);
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
};
