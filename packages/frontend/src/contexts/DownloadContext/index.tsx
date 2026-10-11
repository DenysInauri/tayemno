import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { zipSync } from "fflate";
import type {
  IGetFoldersByParentResponse,
  IGetVaultsByFolderResponse,
} from "@tayemno/shared";

import type { ITransferItem } from "../../components/files/TransferAlert";
import type { ILocalFolder, ILocalVault } from "../../types/local";
import { useAuth } from "../AuthContext";
import { useDecryptFolderAsMember } from "../../api/hooks/useDecryptFolderAsMember";
import { useDecryptVaultAsMember } from "../../api/hooks/useDecryptVaultAsMember";
import { axios } from "../../api";
import { EndpointEnum } from "../../enums/api/EndpointEnum";
import { StreamCrypto } from "../../utils/crypto/StreamCrypto";
import { downloadBlob } from "../../utils/downloadBlob";
import { createThrottledProgress } from "../../utils/createThrottledProgress";
import { fetchWithProgress } from "../../utils/fetchWithProgress";

interface IFolderContent {
  folders: ILocalFolder[];
  vaults: ILocalVault[];
}

interface ITreeNode {
  folder: ILocalFolder;
  vaults: ILocalVault[];
  children: ITreeNode[];
}

interface IDownloadContext {
  downloads: ITransferItem[];
  download: (vault: ILocalVault) => void;
  downloadFolder: (folder: ILocalFolder) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
  isDownloading: (id: string) => boolean;
}

const DownloadContext = createContext<IDownloadContext | null>(null);

interface IDownloadProviderProps {
  children: ReactNode;
}

export const DownloadProvider = ({ children }: IDownloadProviderProps) => {
  const { workspace } = useAuth();
  const { decrypt: decryptFolder } = useDecryptFolderAsMember();
  const { decrypt: decryptVault } = useDecryptVaultAsMember();

  const downloadsRef = useRef<Map<string, ITransferItem>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [downloads, setDownloads] = useState<ITransferItem[]>([]);

  const syncDownloads = () => {
    setDownloads([...downloadsRef.current.values()]);
  };

  const download = useCallback(
    async (vault: ILocalVault) => {
      const vaultId = vault.id;

      if (downloadsRef.current.has(vaultId)) return;

      const controller = new AbortController();
      controllersRef.current.set(vaultId, controller);

      downloadsRef.current.set(vaultId, {
        id: vaultId,
        fileName: vault.name,
        progress: 0,
      });
      syncDownloads();

      const tp = createThrottledProgress((value: number) => {
        const entry = downloadsRef.current.get(vaultId);
        if (entry) {
          entry.progress = value;
          syncDownloads();
        }
      });

      try {
        const { data } = await axios.get<{ presignedUrl: string }>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.VAULTS}/${vaultId}/download-url`,
        );

        const encryptedBlob = await fetchWithProgress(
          data.presignedUrl,
          (ratio) => tp.set(Math.round(ratio * 50)),
          controller.signal,
        );

        const decryptedBlob = await StreamCrypto.decryptFile(
          encryptedBlob,
          vault.symmetricKey,
          vault.contentNonce,
          (ratio) => tp.set(50 + Math.round(ratio * 50)),
          controller.signal,
        );

        tp.flush();

        downloadBlob(decryptedBlob, vault.name, vault.mimeType);
      } catch (err: any) {
        if (err?.name !== "AbortError") throw err;
      } finally {
        controllersRef.current.delete(vaultId);
        downloadsRef.current.delete(vaultId);
        tp.cancel();
        syncDownloads();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace],
  );

  const FOLDER_DOWNLOAD_CONCURRENCY = 5;

  const downloadFolder = useCallback(
    async (folder: ILocalFolder) => {
      const id = folder.id;

      if (downloadsRef.current.has(id)) return;
      if (!workspace) return;

      const controller = new AbortController();
      controllersRef.current.set(id, controller);

      downloadsRef.current.set(id, {
        id,
        fileName: folder.name,
        progress: 0,
      });
      syncDownloads();

      const tp = createThrottledProgress((value: number) => {
        const entry = downloadsRef.current.get(id);
        if (entry) {
          entry.progress = value;
          syncDownloads();
        }
      });

      try {
        const fetchFolderContents = async (
          folderId: string,
        ): Promise<IFolderContent> => {
          if (controller.signal.aborted) {
            throw new DOMException("Download aborted", "AbortError");
          }

          const [foldersRes, vaultsRes] = await Promise.all([
            axios.get<IGetFoldersByParentResponse>(
              `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}?parentFolderId=${folderId}`,
            ),
            axios.get<IGetVaultsByFolderResponse>(
              `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.VAULTS}?folderId=${folderId}`,
            ),
          ]);

          const folders = await Promise.all(
            foldersRes.data.folders.map(decryptFolder),
          );
          const vaults = await Promise.all(
            vaultsRes.data.vaults.map(decryptVault),
          );

          return { folders, vaults };
        };

        const buildTree = async (
          rootFolder: ILocalFolder,
        ): Promise<ITreeNode> => {
          const contents = await fetchFolderContents(rootFolder.id);

          const children = await Promise.all(contents.folders.map(buildTree));

          return {
            folder: rootFolder,
            vaults: contents.vaults,
            children,
          };
        };

        const tree = await buildTree(folder);

        const countFiles = (node: ITreeNode): number =>
          node.vaults.length +
          node.children.reduce((sum, child) => sum + countFiles(child), 0);

        const totalFiles = countFiles(tree);

        if (totalFiles === 0) {
          const zipData: Record<string, Uint8Array> = {};

          const addEmptyDirs = (node: ITreeNode, path: string) => {
            if (node.children.length === 0 && node.vaults.length === 0) {
              zipData[path + "/"] = new Uint8Array(0);
            }
            for (const child of node.children) {
              addEmptyDirs(child, `${path}/${child.folder.name}`);
            }
          };

          for (const child of tree.children) {
            addEmptyDirs(child, child.folder.name);
          }

          if (Object.keys(zipData).length === 0) {
            zipData["/"] = new Uint8Array(0);
          }

          const zipped = zipSync(zipData);
          const blob = new Blob([zipped], { type: "application/zip" });
          downloadBlob(blob, `${folder.name}.zip`, "application/zip");

          tp.flush();
          return;
        }

        const fileProgresses = new Array<number>(totalFiles).fill(0);
        let fileIndex = 0;

        const updateAggregateProgress = () => {
          const sum = fileProgresses.reduce((s, p) => s + p, 0);
          tp.set(Math.round(sum / totalFiles));
        };

        const zipEntries: Record<string, Uint8Array> = {};

        const downloadSingleVault = async (
          vault: ILocalVault,
          zipPath: string,
        ) => {
          const idx = fileIndex++;

          const { data } = await axios.get<{ presignedUrl: string }>(
            `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.VAULTS}/${vault.id}/download-url`,
          );

          const encryptedBlob = await fetchWithProgress(
            data.presignedUrl,
            (ratio) => {
              fileProgresses[idx] = Math.round(ratio * 50);
              updateAggregateProgress();
            },
            controller.signal,
          );

          const decryptedBlob = await StreamCrypto.decryptFile(
            encryptedBlob,
            vault.symmetricKey,
            vault.contentNonce,
            (ratio) => {
              fileProgresses[idx] = 50 + Math.round(ratio * 50);
              updateAggregateProgress();
            },
            controller.signal,
          );

          const arrayBuffer = await decryptedBlob.arrayBuffer();
          zipEntries[zipPath] = new Uint8Array(arrayBuffer);

          fileProgresses[idx] = 100;
          updateAggregateProgress();
        };

        const processNode = async (node: ITreeNode, parentPath: string) => {
          if (controller.signal.aborted) {
            throw new DOMException("Download aborted", "AbortError");
          }

          const executing = new Set<Promise<void>>();
          let firstError: Error | null = null;

          for (const vault of node.vaults) {
            if (controller.signal.aborted || firstError) break;

            const zipPath = parentPath
              ? `${parentPath}/${vault.name}`
              : vault.name;

            const p = downloadSingleVault(vault, zipPath)
              .catch((err) => {
                if (!firstError) firstError = err;
              })
              .finally(() => {
                executing.delete(p);
              });
            executing.add(p);

            if (executing.size >= FOLDER_DOWNLOAD_CONCURRENCY) {
              await Promise.race(executing);
            }
          }

          await Promise.allSettled(executing);

          if (firstError) throw firstError;

          if (
            node.vaults.length === 0 &&
            node.children.length === 0 &&
            parentPath
          ) {
            zipEntries[parentPath + "/"] = new Uint8Array(0);
          }

          for (const child of node.children) {
            const childPath = parentPath
              ? `${parentPath}/${child.folder.name}`
              : child.folder.name;
            await processNode(child, childPath);
          }
        };

        await processNode(tree, "");

        tp.flush();

        const zipped = zipSync(zipEntries);
        const blob = new Blob([zipped], { type: "application/zip" });
        downloadBlob(blob, `${folder.name}.zip`, "application/zip");
      } catch (err: any) {
        if (err?.name !== "AbortError") throw err;
      } finally {
        controllersRef.current.delete(id);
        downloadsRef.current.delete(id);
        tp.cancel();
        syncDownloads();
      }
    },
    [workspace],
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
      value={{
        downloads,
        download,
        downloadFolder,
        cancel,
        cancelAll,
        isDownloading,
      }}
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
