import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ITransferItem } from "../../components/files/TransferAlert";
import { useAuth } from "../AuthContext";
import { usePostPresignVault } from "../../api/hooks/usePostPresignVault";
import { usePostCreateVault } from "../../api/hooks/usePostCreateVault";
import type {
  ICreateFolderRequest,
  ICreateFolderResponse,
  ICreateVaultRequest,
  ICreateVaultResponse,
} from "@tayemno/shared";
import { axios } from "../../api";
import { AsymmetricCrypto } from "../../utils/crypto/AsymmetricCrypto";
import { useGetFolderKey } from "../../api/hooks/useGetFolderKey";
import { SymmetricCrypto } from "../../utils/crypto/SymmetricCrypto";
import { StreamCrypto } from "../../utils/crypto/StreamCrypto";
import { createThrottledProgress } from "../../utils/createThrottledProgress";
import { uploadWithProgress } from "../../utils/uploadWithProgress";
import { buildFolderTree, type IFolderNode } from "../../utils/buildFolderTree";
import { QueryKeyEnum } from "../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../enums/api/EndpointEnum";

interface IEncryptAndUploadParams {
  file: File;
  vaultKey: string;
  workspaceId: string;
  folderId: string | null;
  signal: AbortSignal;
  onEncryptProgress: (ratio: number) => void;
  onUploadProgress: (ratio: number) => void;
}

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

const FOLDER_UPLOAD_CONCURRENCY = 5;

export const UploadProvider = ({ children }: IUploadProviderProps) => {
  const { keyPair, workspace, user } = useAuth();
  const queryClient = useQueryClient();
  const presignVault = usePostPresignVault();
  const createVault = usePostCreateVault();
  const { getFolderKey } = useGetFolderKey();

  const uploadsRef = useRef<Map<string, ITransferItem>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const folderCleanupRef = useRef<Map<string, string>>(new Map());
  const [uploads, setUploads] = useState<ITransferItem[]>([]);

  const syncUploads = () => {
    setUploads([...uploadsRef.current.values()]);
  };

  const encryptAndUploadVault = async ({
    file,
    vaultKey,
    workspaceId,
    folderId,
    signal,
    onEncryptProgress,
    onUploadProgress,
  }: IEncryptAndUploadParams) => {
    const { header, encryptedBlob } = await StreamCrypto.encryptFile(
      file,
      vaultKey,
      onEncryptProgress,
      signal,
    );

    const fileName = file.name;
    const extension = fileName.includes(".") ? fileName.split(".").pop()! : "";
    const mimeType = file.type || "application/octet-stream";

    const encryptedNameResult = await SymmetricCrypto.encrypt(
      fileName,
      vaultKey,
    );

    const metadata = JSON.stringify({
      extension,
      mimeType,
      sizeBytes: file.size,
    });
    const encryptedMetadataResult = await SymmetricCrypto.encrypt(
      metadata,
      vaultKey,
    );

    const presignResult = await presignVault.mutateAsync({
      workspaceId,
      folderId,
    });

    await uploadWithProgress(
      presignResult.presignedUrl,
      encryptedBlob,
      onUploadProgress,
      signal,
    );

    return {
      encryptedName: encryptedNameResult.ciphertext,
      nameNonce: encryptedNameResult.nonce,
      encryptedMetadata: encryptedMetadataResult.ciphertext,
      metadataNonce: encryptedMetadataResult.nonce,

      s3Key: presignResult.s3Key,
      contentNonce: header,
    };
  };

  const buildVaultEncryptionKey = async (folderId: string | null) => {
    if (!keyPair || !workspace || !user) return null;

    const vaultKey = await SymmetricCrypto.generateKey();

    if (folderId) {
      const folderSymmetricKey = await getFolderKey(folderId);

      const encryptedVaultKey = await SymmetricCrypto.encrypt(
        vaultKey,
        folderSymmetricKey,
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

        const vaultData = await encryptAndUploadVault({
          file,
          vaultKey: symmetricKey,
          workspaceId: workspace.id,
          folderId,
          signal: controller.signal,
          onEncryptProgress: (ratio) => tp.set(Math.round(ratio * 50)),
          onUploadProgress: (ratio) => tp.set(50 + Math.round(ratio * 50)),
        });

        tp.flush();

        await createVault.mutateAsync({
          workspaceId: workspace.id,
          folderId,
          ...vaultData,
          encryptedSymmetricKey,
          symmetricKeyNonce,
        });

        queryClient.invalidateQueries({
          queryKey: [QueryKeyEnum.VAULTS, workspace.id, folderId],
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

  const uploadFolder = useCallback(
    async (files: FileList, parentFolderId: string | null) => {
      if (!keyPair || !workspace || !user) return;
      if (files.length === 0) return;

      const tree = buildFolderTree(files);
      const totalFiles = files.length;
      const id = crypto.randomUUID();
      const controller = new AbortController();
      controllersRef.current.set(id, controller);

      uploadsRef.current.set(id, {
        id,
        fileName: tree.name,
        progress: 0,
      });
      syncUploads();

      let fileIndex = 0;
      const fileProgresses = new Array<number>(totalFiles).fill(0);
      let rootFolderId: string | null = null;

      const tp = createThrottledProgress((value: number) => {
        const entry = uploadsRef.current.get(id);
        if (entry) {
          entry.progress = value;
          syncUploads();
        }
      });

      const updateAggregateProgress = () => {
        const sum = fileProgresses.reduce((s, p) => s + p, 0);
        tp.set(Math.round(sum / totalFiles));
      };

      const uploadSingleFile = async (
        file: File,
        folderKey: string,
        folderId: string,
      ) => {
        const idx = fileIndex++;

        const vaultKey = await SymmetricCrypto.generateKey();
        const encryptedVaultKey = await SymmetricCrypto.encrypt(
          vaultKey,
          folderKey,
        );

        const vaultData = await encryptAndUploadVault({
          file,
          vaultKey,
          workspaceId: workspace!.id,
          folderId,
          signal: controller.signal,
          onEncryptProgress: (ratio) => {
            fileProgresses[idx] = Math.round(ratio * 50);
            updateAggregateProgress();
          },
          onUploadProgress: (ratio) => {
            fileProgresses[idx] = 50 + Math.round(ratio * 50);
            updateAggregateProgress();
          },
        });

        await axios.post<ICreateVaultResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.VAULTS}`,
          {
            workspaceId: workspace!.id,
            folderId,
            ...vaultData,
            encryptedSymmetricKey: encryptedVaultKey.ciphertext,
            symmetricKeyNonce: encryptedVaultKey.nonce,
          } satisfies ICreateVaultRequest,
        );

        fileProgresses[idx] = 100;
        updateAggregateProgress();
      };

      const processFolder = async (
        node: IFolderNode,
        parentId: string | null,
      ) => {
        if (controller.signal.aborted) {
          throw new DOMException("Upload aborted", "AbortError");
        }

        const folderKey = await SymmetricCrypto.generateKey();
        const adminEncryptedKey = await AsymmetricCrypto.encrypt(
          folderKey,
          workspace!.adminPublicKey,
        );
        const memberEncryptedKey = await AsymmetricCrypto.encrypt(
          folderKey,
          user!.publicKey,
        );
        const encryptedName = await SymmetricCrypto.encrypt(
          node.name,
          folderKey,
        );

        const { data: folderResult } = await axios.post<ICreateFolderResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders`,
          {
            encryptedName: encryptedName.ciphertext,
            nameNonce: encryptedName.nonce,
            encryptedSymmetricKey: adminEncryptedKey,
            memberEncryptedSymmetricKey: memberEncryptedKey,
            parentFolderId: parentId,
          } satisfies ICreateFolderRequest,
        );

        const folderId = folderResult.folder.id;

        if (!rootFolderId) {
          rootFolderId = folderId;
          folderCleanupRef.current.set(id, rootFolderId);
        }

        const executing = new Set<Promise<void>>();
        let firstError: Error | null = null;

        for (const file of node.files) {
          if (controller.signal.aborted || firstError) break;

          const p = uploadSingleFile(file, folderKey, folderId)
            .catch((err) => {
              if (!firstError) firstError = err;
            })
            .finally(() => {
              executing.delete(p);
            });
          executing.add(p);

          if (executing.size >= FOLDER_UPLOAD_CONCURRENCY) {
            await Promise.race(executing);
          }
        }

        await Promise.allSettled(executing);

        if (firstError) throw firstError;

        for (const child of node.children) {
          await processFolder(child, folderId);
        }
      };

      try {
        await processFolder(tree, parentFolderId);

        tp.flush();
        queryClient.invalidateQueries({
          queryKey: [QueryKeyEnum.FOLDERS, workspace.id, parentFolderId],
        });
      } catch (err: any) {
        controller.abort();

        if (rootFolderId) {
          try {
            await axios.delete(
              `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders/${rootFolderId}`,
            );
          } catch {
            // Best-effort cleanup
          }
        }

        if (err?.name !== "AbortError") throw err;
      } finally {
        controllersRef.current.delete(id);
        folderCleanupRef.current.delete(id);
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
    <UploadContext.Provider
      value={{ uploads, upload, uploadFolder, cancel, cancelAll }}
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
