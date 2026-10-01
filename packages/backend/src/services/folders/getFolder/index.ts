import type { Database } from "../../../db";
import type { IGetFolderResponse } from "@tayemno/shared";
import { findByIdAndUserId } from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getFolder = async (
  db: Database,
  userId: string,
  workspaceId: string,
  folderId: string,
): Promise<IGetFolderResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const row = await findByIdAndUserId(db, folderId, userId);

  if (!row) {
    throw new HttpError(404, "Folder not found");
  }

  return {
    folder: mapTimestamps(row),
  };
};
