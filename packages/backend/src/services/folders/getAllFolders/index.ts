import type { IGetAllFoldersResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getAllFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetAllFoldersResponse> => {
  const [rows, acls] = await Promise.all([
    foldersRepo.findAllByUser(db, workspaceId, userId),
    folderAclsRepo.findByUserIdAndWorkspaceId(db, userId, workspaceId),
  ]);

  return {
    folders: rows.map(mapTimestamps) as IGetAllFoldersResponse["folders"],
    acls: acls.map(mapTimestamps) as IGetAllFoldersResponse["acls"],
  };
};
