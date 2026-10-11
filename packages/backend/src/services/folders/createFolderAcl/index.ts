import type { ICreateFolderAclRequest, ICreateFolderAclResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const createFolderAcl = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  data: ICreateFolderAclRequest,
): Promise<ICreateFolderAclResponse> => {
  // Verify requesting user has access to this folder
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  // Check if ACL already exists
  const existing = await folderAclsRepo.findByFolderIdAndUserId(
    db,
    folderId,
    data.userId,
  );

  if (existing) {
    throw new HttpError(409, "User already has access to this folder");
  }

  const acl = await folderAclsRepo.create(db, {
    folderId,
    userId: data.userId,
    encryptedFolderKey: data.encryptedFolderKey,
  });

  return { acl: mapTimestamps(acl) };
};
