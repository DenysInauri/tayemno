import { useRef, useState } from "react";
import type { Vault } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";
import { downloadBlob } from "../../../utils/downloadBlob";
import { useDecryptVaultKey } from "../useDecryptVaultKey";
import { createThrottledProgress } from "../../../utils/createThrottledProgress";
import { fetchWithProgress } from "../../../utils/fetchWithProgress";

export const useDownloadVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const { decryptVaultKey } = useDecryptVaultKey();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const download = async (vault: Vault) => {
    if (!keyPair || !workspace || !user) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setIsDownloading(true);
    setProgress(0);

    const tp = createThrottledProgress(setProgress);

    try {
      const { data } = await axios.get<{ presignedUrl: string }>(
        `${EndpointEnum.VAULTS}/${vault.id}/download-url`,
      );

      const encryptedBlob = await fetchWithProgress(
        data.presignedUrl,
        (ratio) => tp.set(Math.round(ratio * 50)),
        signal,
      );

      const vaultKey = await decryptVaultKey(vault);

      const decryptedBlob = await StreamCrypto.decryptFile(
        encryptedBlob,
        vaultKey,
        vault.contentNonce,
        (ratio) => tp.set(50 + Math.round(ratio * 50)),
        signal,
      );

      tp.flush();

      downloadBlob(decryptedBlob, vault.name, vault.mimeType);
    } catch (err: any) {
      if (err?.name !== "AbortError") throw err;
    } finally {
      abortControllerRef.current = null;
      tp.cancel();
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const cancel = () => {
    abortControllerRef.current?.abort();
  };

  return { download, cancel, isDownloading, progress };
};
