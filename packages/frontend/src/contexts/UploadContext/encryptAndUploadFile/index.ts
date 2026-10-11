import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";
import { uploadWithProgress } from "../../../utils/uploadWithProgress";

interface IParams {
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

export const encryptAndUploadFile = async ({
  file,
  vaultKey,
  workspaceId,
  folderId,
  signal,
  onEncryptProgress,
  onUploadProgress,
  presignMutate,
}: IParams) => {
  const { header, encryptedBlob } = await StreamCrypto.encryptFile(
    file,
    vaultKey,
    onEncryptProgress,
    signal,
  );

  const fileName = file.name;
  const extension = fileName.includes(".") ? fileName.split(".").pop()! : "";
  const mimeType = file.type || "application/octet-stream";

  const [encryptedNameResult, encryptedMetadataResult, presignResult] =
    await Promise.all([
      SymmetricCrypto.encrypt(fileName, vaultKey),
      SymmetricCrypto.encrypt(
        JSON.stringify({ extension, mimeType, sizeBytes: file.size }),
        vaultKey,
      ),
      presignMutate({ workspaceId, folderId }),
    ]);

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
