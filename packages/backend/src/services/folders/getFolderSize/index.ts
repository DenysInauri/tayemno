import type { Database } from "../../../db";
import type { IGetFolderSizeResponse } from "@tayemno/shared";
import { findDescendantSizes } from "../../../repositories/folders";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import { HttpError } from "../../../utils/httpError";

export const getFolderSize = async (
  db: Database,
  userId: string,
  folderId: string,
): Promise<IGetFolderSizeResponse> => {
  const membership = await folderMembersRepo.findByFolderIdAndUserId(
    db,
    folderId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const sizes = await findDescendantSizes(db, folderId);

  return {
    sizeBytes: Number(sizes.sizeBytes),
    encryptedSizeBytes: Number(sizes.encryptedSizeBytes),
  };
};
