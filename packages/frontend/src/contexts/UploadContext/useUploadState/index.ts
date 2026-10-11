import { useCallback, useRef, useState } from "react";
import type { ITransferItem } from "../../../components/files/TransferAlert";

export interface IUploadState {
  uploads: ITransferItem[];
  registerUpload: (id: string, fileName: string) => AbortController;
  cleanupUpload: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
}

export const useUploadState = (): IUploadState => {
  const uploadsRef = useRef<Map<string, ITransferItem>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [uploads, setUploads] = useState<ITransferItem[]>([]);

  const syncUploads = useCallback(() => {
    setUploads([...uploadsRef.current.values()]);
  }, []);

  const registerUpload = useCallback(
    (id: string, fileName: string) => {
      const controller = new AbortController();
      controllersRef.current.set(id, controller);
      uploadsRef.current.set(id, { id, fileName, progress: 0 });
      syncUploads();
      return controller;
    },
    [syncUploads],
  );

  const cleanupUpload = useCallback(
    (id: string) => {
      controllersRef.current.delete(id);
      uploadsRef.current.delete(id);
      syncUploads();
    },
    [syncUploads],
  );

  const updateProgress = useCallback(
    (id: string, progress: number) => {
      const entry = uploadsRef.current.get(id);
      if (entry) {
        entry.progress = progress;
        syncUploads();
      }
    },
    [syncUploads],
  );

  const cancel = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    controllersRef.current.forEach((c) => c.abort());
  }, []);

  return {
    uploads,
    registerUpload,
    cleanupUpload,
    updateProgress,
    cancel,
    cancelAll,
  };
};
