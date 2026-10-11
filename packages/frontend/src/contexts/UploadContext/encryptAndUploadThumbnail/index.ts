import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";
import { uploadWithProgress } from "../../../utils/uploadWithProgress";
import { generateThumbnail } from "../../../utils/generateThumbnail";

interface IParams {
  file: File;
  vaultKey: string;
  workspaceId: string;
  folderId: string | null;
  signal: AbortSignal;
  presignMutate: (params: {
    workspaceId: string;
    folderId: string | null;
  }) => Promise<{ presignedUrl: string; s3Key: string }>;
}

export const encryptAndUploadThumbnail = async ({
  file,
  vaultKey,
  workspaceId,
  folderId,
  signal,
  presignMutate,
}: IParams) => {
  const thumbnailBlob = await generateThumbnail(file);
  if (!thumbnailBlob) return { thumbnailS3Key: null, thumbnailNonce: null };

  const thumbFile = new File([thumbnailBlob], "thumb.jpg", {
    type: "image/jpeg",
  });
  const [thumbEncrypted, thumbPresign] = await Promise.all([
    StreamCrypto.encryptFile(thumbFile, vaultKey, () => {}, signal),
    presignMutate({ workspaceId, folderId }),
  ]);

  await uploadWithProgress(
    thumbPresign.presignedUrl,
    thumbEncrypted.encryptedBlob,
    () => {},
    signal,
  );

  return {
    thumbnailS3Key: thumbPresign.s3Key,
    thumbnailNonce: thumbEncrypted.header,
  };
};
