import { encryptAndUploadFile } from "../encryptAndUploadFile";
import { encryptAndUploadThumbnail } from "../encryptAndUploadThumbnail";

export interface IEncryptAndUploadVaultParams {
  file: File;
  vaultKey: string;
  workspaceId: string;
  folderId: string | null;
  signal: AbortSignal;
  onEncryptProgress: (ratio: number) => void;
  onUploadProgress: (ratio: number) => void;
  presignMutate: (params: {
    workspaceId: string;
    folderId: string | null;
  }) => Promise<{ presignedUrl: string; s3Key: string }>;
}

export const encryptAndUploadVault = async (
  params: IEncryptAndUploadVaultParams,
) => {
  const { file, vaultKey, workspaceId, folderId, signal } = params;

  const [fileResult, thumbResult] = await Promise.all([
    encryptAndUploadFile(params),
    encryptAndUploadThumbnail({
      file,
      vaultKey,
      workspaceId,
      folderId,
      signal,
      presignMutate: params.presignMutate,
    }),
  ]);

  return { ...fileResult, ...thumbResult };
};
