import type { IGetFoldersByParentResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getFoldersByParent = async (
  db: Database,
  userId: string,
  workspaceId: string,
  parentFolderId: string | null,
): Promise<IGetFoldersByParentResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await foldersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
    parentFolderId,
  );

  return { folders: rows.map(mapTimestamps) as IGetFoldersByParentResponse["folders"] };
};
