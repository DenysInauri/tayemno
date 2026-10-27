import type { IGetFolderResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getFolder = async (
  db: Database,
  userId: string,
  folderId: string,
): Promise<IGetFolderResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, userId);

  if (!folder) {
    throw new HttpError(404, "Folder not found");
  }

  const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, userId);

  return {
    folder: mapTimestamps(folder) as IGetFolderResponse["folder"],
    permissions: permissions!,
  };
};
