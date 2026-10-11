import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { ITransferItem } from "../../components/files/TransferAlert";
import { useUploadState } from "./useUploadState";
import { useFileUpload } from "./useFileUpload";
import { useFolderUpload } from "./useFolderUpload";

interface IUploadContext {
  uploads: ITransferItem[];
  upload: (file: File, folderId: string | null) => void;
  uploadFolder: (files: FileList, parentFolderId: string | null) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
}

const UploadContext = createContext<IUploadContext | null>(null);

interface IUploadProviderProps {
  children: ReactNode;
}

export const UploadProvider = ({ children }: IUploadProviderProps) => {
  const state = useUploadState();
  const upload = useFileUpload(state);
  const uploadFolder = useFolderUpload(state);

  return (
    <UploadContext.Provider
      value={{
        uploads: state.uploads,
        upload,
        uploadFolder,
        cancel: state.cancel,
        cancelAll: state.cancelAll,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = (): IUploadContext => {
  const context = useContext(UploadContext);

  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }

  return context;
};
