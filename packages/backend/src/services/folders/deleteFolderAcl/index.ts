import type { IDeleteFolderAclResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";

export const deleteFolderAcl = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  targetUserId: string,
): Promise<IDeleteFolderAclResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  await folderAclsRepo.deleteByFolderIdAndUserId(db, folderId, targetUserId);

  return { message: "Access revoked" };
};
