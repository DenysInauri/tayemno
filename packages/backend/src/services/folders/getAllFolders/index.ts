import type { IGetAllFoldersResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getAllFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetAllFoldersResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(db, workspaceId, userId);
  if (!membership) throw new HttpError(403, "Access denied");

  const rows = await foldersRepo.findAllByUser(db, workspaceId, userId);
  return { folders: rows.map(mapTimestamps) };
};
