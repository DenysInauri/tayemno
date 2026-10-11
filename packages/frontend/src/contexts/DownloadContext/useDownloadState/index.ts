import { useCallback, useRef, useState } from "react";
import type { ITransferItem } from "../../../components/files/TransferAlert";

export interface IDownloadState {
  downloads: ITransferItem[];
  isDownloadActive: (id: string) => boolean;
  registerDownload: (id: string, fileName: string) => AbortController;
  cleanupDownload: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
  isDownloading: (id: string) => boolean;
}

export const useDownloadState = (): IDownloadState => {
  const downloadsRef = useRef<Map<string, ITransferItem>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [downloads, setDownloads] = useState<ITransferItem[]>([]);

  const syncDownloads = useCallback(() => {
    setDownloads([...downloadsRef.current.values()]);
  }, []);

  const isDownloadActive = useCallback(
    (id: string) => downloadsRef.current.has(id),
    [],
  );

  const registerDownload = useCallback(
    (id: string, fileName: string) => {
      const controller = new AbortController();
      controllersRef.current.set(id, controller);
      downloadsRef.current.set(id, { id, fileName, progress: 0 });
      syncDownloads();
      return controller;
    },
    [syncDownloads],
  );

  const cleanupDownload = useCallback(
    (id: string) => {
      controllersRef.current.delete(id);
      downloadsRef.current.delete(id);
      syncDownloads();
    },
    [syncDownloads],
  );

  const updateProgress = useCallback(
    (id: string, progress: number) => {
      const entry = downloadsRef.current.get(id);
      if (entry) {
        entry.progress = progress;
        syncDownloads();
      }
    },
    [syncDownloads],
  );

  const cancel = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    controllersRef.current.forEach((c) => c.abort());
  }, []);

  const isDownloading = useCallback(
    (id: string) => downloadsRef.current.has(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [downloads],
  );

  return {
    downloads,
    isDownloadActive,
    registerDownload,
    cleanupDownload,
    updateProgress,
    cancel,
    cancelAll,
    isDownloading,
  };
};
