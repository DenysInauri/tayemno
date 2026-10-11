import type {
  ICreateFolderRequest,
  ICreateFolderResponse,
  ICreateVaultRequest,
  ICreateVaultResponse,
} from "@tayemno/shared";
import type { IFolderNode } from "../../../utils/buildFolderTree";
import { axios } from "../../../api";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { encryptAndUploadVault } from "../encryptAndUploadVault";

const FOLDER_UPLOAD_CONCURRENCY = 10;

interface IProcessFolderDeps {
  workspaceId: string;
  adminPublicKey: string;
  userPublicKey: string;
  signal: AbortSignal;
  presignMutate: (params: {
    workspaceId: string;
    folderId: string | null;
  }) => Promise<{ presignedUrl: string; s3Key: string }>;
  onFileEncryptProgress: (idx: number, ratio: number) => void;
  onFileUploadProgress: (idx: number, ratio: number) => void;
  onFileComplete: (idx: number) => void;
  nextFileIndex: () => number;
}

const uploadSingleFile = async (
  file: File,
  folderKey: string,
  folderId: string,
  deps: IProcessFolderDeps,
) => {
  const idx = deps.nextFileIndex();

  const vaultKey = await SymmetricCrypto.generateKey();
  const encryptedVaultKey = await SymmetricCrypto.encrypt(vaultKey, folderKey);
  const adminEncryptedVaultKey = await AsymmetricCrypto.encrypt(
    vaultKey,
    deps.adminPublicKey,
  );

  const vaultData = await encryptAndUploadVault({
    file,
    vaultKey,
    workspaceId: deps.workspaceId,
    folderId,
    signal: deps.signal,
    presignMutate: deps.presignMutate,
    onEncryptProgress: (ratio) => deps.onFileEncryptProgress(idx, ratio),
    onUploadProgress: (ratio) => deps.onFileUploadProgress(idx, ratio),
  });

  await axios.post<ICreateVaultResponse>(
    `${EndpointEnum.WORKSPACES}/${deps.workspaceId}${EndpointEnum.VAULTS}`,
    {
      workspaceId: deps.workspaceId,
      folderId,
      ...vaultData,
      encryptedSymmetricKey: encryptedVaultKey.ciphertext,
      symmetricKeyNonce: encryptedVaultKey.nonce,
      adminEncryptedSymmetricKey: adminEncryptedVaultKey,
    } satisfies ICreateVaultRequest,
  );

  deps.onFileComplete(idx);
};

export const processFolder = async (
  node: IFolderNode,
  parentId: string | null,
  parentKey: string | null,
  deps: IProcessFolderDeps,
) => {
  if (deps.signal.aborted) {
    throw new DOMException("Upload aborted", "AbortError");
  }

  const folderKey = await SymmetricCrypto.generateKey();
  const adminEncryptedKey = await AsymmetricCrypto.encrypt(
    folderKey,
    deps.adminPublicKey,
  );
  const aclEncryptedKey = await AsymmetricCrypto.encrypt(
    folderKey,
    deps.userPublicKey,
  );

  let wrappedKey: string | null = null;
  let wrappedKeyNonce: string | null = null;

  if (parentKey) {
    const wrapped = await SymmetricCrypto.encrypt(folderKey, parentKey);
    wrappedKey = wrapped.ciphertext;
    wrappedKeyNonce = wrapped.nonce;
  }

  const encryptedName = await SymmetricCrypto.encrypt(node.name, folderKey);

  const { data: folderResult } = await axios.post<ICreateFolderResponse>(
    `${EndpointEnum.WORKSPACES}/${deps.workspaceId}/folders`,
    {
      encryptedName: encryptedName.ciphertext,
      nameNonce: encryptedName.nonce,
      encryptedSymmetricKey: adminEncryptedKey,
      wrappedKey,
      wrappedKeyNonce,
      aclEncryptedFolderKey: aclEncryptedKey,
      parentFolderId: parentId,
    } satisfies ICreateFolderRequest,
  );

  const folderId = folderResult.folder.id;

  const executing = new Set<Promise<void>>();
  let firstError: Error | null = null;

  for (const file of node.files) {
    if (deps.signal.aborted || firstError) break;

    const p = uploadSingleFile(file, folderKey, folderId, deps)
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
    await processFolder(child, folderId, folderKey, deps);
  }
};
