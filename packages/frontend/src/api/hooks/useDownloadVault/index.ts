import { useState } from "react";
import type { Vault } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";
import { downloadBlob } from "../../../utils/downloadBlob";
import { useDecryptVaultKey } from "../useDecryptVaultKey";

export const useDownloadVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const { decryptVaultKey } = useDecryptVaultKey();
  const [isDownloading, setIsDownloading] = useState(false);

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
