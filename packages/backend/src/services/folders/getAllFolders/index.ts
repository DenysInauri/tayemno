import type { IGetAllFoldersResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getAllFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetAllFoldersResponse> => {
  const rows = await foldersRepo.findAllByUser(db, workspaceId, userId);
  return { folders: rows.map(mapTimestamps) };
};
