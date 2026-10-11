import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { ITransferItem } from "../../components/files/TransferAlert";
import type { ILocalFolder, ILocalVault } from "../../types/local";
import { useDownloadState } from "./useDownloadState";
import { useFileDownload } from "./useFileDownload";
import { useFolderDownload } from "./useFolderDownload";

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
  const state = useDownloadState();
  const download = useFileDownload(state);
  const downloadFolder = useFolderDownload(state);

  return (
    <DownloadContext.Provider
      value={{
        downloads: state.downloads,
        download,
        downloadFolder,
        cancel: state.cancel,
        cancelAll: state.cancelAll,
        isDownloading: state.isDownloading,
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
