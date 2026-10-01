import type { Database } from "../../../db";
import type { IGetFoldersResponse } from "@tayemno/shared";
import {
  findByWorkspaceIdAndUserId,
  findAncestors,
} from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
  parentFolderId: string | null,
): Promise<IGetFoldersResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
    parentFolderId,
  );

  const breadcrumbs = parentFolderId
    ? await findAncestors(db, parentFolderId, userId)
    : [];

  return {
    folders: rows.map(mapTimestamps),
    breadcrumbs,
  };
};
