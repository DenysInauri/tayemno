import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { ITransferItem } from "../../components/files/TransferAlert";
import { useAuth } from "../AuthContext";
import { usePostPresignVault } from "../../api/hooks/usePostPresignVault";
import { usePostCreateVault } from "../../api/hooks/usePostCreateVault";
import { AsymmetricCrypto } from "../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../utils/crypto/SymmetricCrypto";
import { StreamCrypto } from "../../utils/crypto/StreamCrypto";
import { getFolderKey } from "../../services/folderKeyService";
import { createThrottledProgress } from "../../utils/createThrottledProgress";
import { uploadWithProgress } from "../../utils/uploadWithProgress";

interface IUploadContext {
  uploads: ITransferItem[];
  upload: (file: File, folderId: string | null) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
}

const UploadContext = createContext<IUploadContext | null>(null);

interface IUploadProviderProps {
  children: ReactNode;
}

export const UploadProvider = ({ children }: IUploadProviderProps) => {
  const { keyPair, workspace, user } = useAuth();
  const presignVault = usePostPresignVault();
  const createVault = usePostCreateVault();

  const uploadsRef = useRef<Map<string, ITransferItem>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [uploads, setUploads] = useState<ITransferItem[]>([]);

  const syncUploads = () => {
    setUploads([...uploadsRef.current.values()]);
  };

  const buildVaultEncryptionKey = async (folderId: string | null) => {
    if (!keyPair || !workspace || !user) return null;

    const vaultKey = await SymmetricCrypto.generateKey();

    if (folderId) {
      const folderKey = await getFolderKey(
        folderId,
        workspace.id,
        user.publicKey,
        keyPair.privateKey,
      );

      const encryptedVaultKey = await SymmetricCrypto.encrypt(
        vaultKey,
        folderKey,
      );

      return {
        symmetricKey: vaultKey,
        encryptedSymmetricKey: encryptedVaultKey.ciphertext,
        symmetricKeyNonce: encryptedVaultKey.nonce,
      };
    }

    const encryptedSymmetricKey = await AsymmetricCrypto.encrypt(
      vaultKey,
      workspace.memberPublicKey,
    );

    return {
      encryptedSymmetricKey,
      symmetricKeyNonce: null,
      symmetricKey: vaultKey,
    };
  };

  const upload = useCallback(
    async (file: File, folderId: string | null) => {
      if (!keyPair || !workspace || !user) return;

      const id = crypto.randomUUID();
      const controller = new AbortController();
      controllersRef.current.set(id, controller);

      uploadsRef.current.set(id, {
        id,
        fileName: file.name,
        progress: 0,
      });
      syncUploads();

      const tp = createThrottledProgress((value: number) => {
        const entry = uploadsRef.current.get(id);
        if (entry) {
          entry.progress = value;
          syncUploads();
        }
      });

      try {
        const encryptionKeyResult = await buildVaultEncryptionKey(folderId);
        if (!encryptionKeyResult) return;

        const { encryptedSymmetricKey, symmetricKeyNonce, symmetricKey } =
          encryptionKeyResult;

        const { header, encryptedBlob } = await StreamCrypto.encryptFile(
          file,
          symmetricKey,
          (ratio) => tp.set(Math.round(ratio * 50)),
          controller.signal,
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

        await uploadWithProgress(
          presignResult.presignedUrl,
          encryptedBlob,
          (ratio) => tp.set(50 + Math.round(ratio * 50)),
          controller.signal,
        );

        tp.flush();

        await createVault.mutateAsync({
          workspaceId: workspace.id,
          folderId,
          name: fileName,
          mimeType,
          extension,
          sizeBytes: file.size,
          encryptedSizeBytes: encryptedBlob.size,
          s3Key: presignResult.s3Key,
          contentNonce: header,
          encryptedSymmetricKey,
          symmetricKeyNonce,
        });
      } catch (err: any) {
        if (err?.name !== "AbortError") throw err;
      } finally {
        controllersRef.current.delete(id);
        uploadsRef.current.delete(id);
        tp.cancel();
        syncUploads();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyPair, workspace, user],
  );

  const cancel = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    controllersRef.current.forEach((controller) => controller.abort());
  }, []);

  return (
    <UploadContext.Provider value={{ uploads, upload, cancel, cancelAll }}>
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
