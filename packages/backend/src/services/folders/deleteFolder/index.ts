import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import type { IDeleteFolderResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import type { S3 } from "../../../utils/s3";
import * as foldersRepo from "../../../repositories/folders";
import { HttpError } from "../../../utils/httpError";

export const deleteFolder = async (
  s3: S3,
  bucket: string,
  db: Database,
  userId: string,
  folderId: string,
): Promise<IDeleteFolderResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, userId);

  if (!folder) {
    throw new HttpError(404, "Folder not found");
  }

  const s3Keys = await foldersRepo.findDescendantVaultS3Keys(db, folderId);

  try {
    const BATCH_SIZE = 1000;
    for (let i = 0; i < s3Keys.length; i += BATCH_SIZE) {
      const batch = s3Keys.slice(i, i + BATCH_SIZE);
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch.map((key) => ({ Key: key })),
          },
        }),
      );
    }
  } catch {
    // S3 cleanup is best-effort — orphaned objects are acceptable
  }

  const descendantIds = await foldersRepo.findDescendantIds(db, folderId);
  await foldersRepo.deleteByIds(db, descendantIds);

  return { message: "Folder deleted" };
};
