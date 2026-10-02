import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Vault } from "@tayemno/shared";

import type { ITransferItem } from "../../components/files/TransferAlert";
import { axios } from "../../api";
import { useAuth } from "../AuthContext";
import { useDecryptVaultKey } from "../../api/hooks/useDecryptVaultKey";
import { EndpointEnum } from "../../enums/api/EndpointEnum";
import { StreamCrypto } from "../../utils/crypto/StreamCrypto";
import { downloadBlob } from "../../utils/downloadBlob";
import { createThrottledProgress } from "../../utils/createThrottledProgress";
import { fetchWithProgress } from "../../utils/fetchWithProgress";

interface IDownloadContext {
  downloads: ITransferItem[];
  download: (vault: Vault) => void;
  cancel: (vaultId: string) => void;
  cancelAll: () => void;
  isDownloading: (vaultId: string) => boolean;
}

const DownloadContext = createContext<IDownloadContext | null>(null);

interface IDownloadProviderProps {
  children: ReactNode;
}

export const DownloadProvider = ({ children }: IDownloadProviderProps) => {
  const { keyPair, workspace, user } = useAuth();
  const { decryptVaultKey } = useDecryptVaultKey();

  const downloadsRef = useRef<Map<string, ITransferItem>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [downloads, setDownloads] = useState<ITransferItem[]>([]);

  const syncDownloads = () => {
    setDownloads([...downloadsRef.current.values()]);
  };

  const download = useCallback(
    async (vault: Vault) => {
      if (!keyPair || !workspace || !user) return;
      if (downloadsRef.current.has(vault.id)) return;

      const controller = new AbortController();
      controllersRef.current.set(vault.id, controller);

      downloadsRef.current.set(vault.id, {
        id: vault.id,
        fileName: vault.name,
        progress: 0,
      });
      syncDownloads();

      const tp = createThrottledProgress((value: number) => {
        const entry = downloadsRef.current.get(vault.id);
        if (entry) {
          entry.progress = value;
          syncDownloads();
        }
      });

      try {
        const { data } = await axios.get<{ presignedUrl: string }>(
          `${EndpointEnum.VAULTS}/${vault.id}/download-url`,
        );

        const encryptedBlob = await fetchWithProgress(
          data.presignedUrl,
          (ratio) => tp.set(Math.round(ratio * 50)),
          controller.signal,
        );

        const vaultKey = await decryptVaultKey(vault);

        const decryptedBlob = await StreamCrypto.decryptFile(
          encryptedBlob,
          vaultKey,
          vault.contentNonce,
          (ratio) => tp.set(50 + Math.round(ratio * 50)),
          controller.signal,
        );

        tp.flush();

        downloadBlob(decryptedBlob, vault.name, vault.mimeType);
      } catch (err: any) {
        if (err?.name !== "AbortError") throw err;
      } finally {
        controllersRef.current.delete(vault.id);
        downloadsRef.current.delete(vault.id);
        tp.cancel();
        syncDownloads();
      }
    },
    [keyPair, workspace, user, decryptVaultKey],
  );

  const cancel = useCallback((vaultId: string) => {
    controllersRef.current.get(vaultId)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    controllersRef.current.forEach((controller) => controller.abort());
  }, []);

  const isDownloading = useCallback(
    (vaultId: string) => downloadsRef.current.has(vaultId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [downloads],
  );

  return (
    <DownloadContext.Provider
      value={{ downloads, download, cancel, cancelAll, isDownloading }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = (): IDownloadContext => {
  const context = useContext(DownloadContext);

  if (!context) {
    throw new Error("useDownload must be used within a DownloadProvider");
  }

  return context;
};
