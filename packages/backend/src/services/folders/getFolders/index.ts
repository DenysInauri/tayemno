import type { Database } from "../../../db";
import type { IGetFoldersResponse } from "@tayemno/shared";
import { findByWorkspaceId } from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const getFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetFoldersResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await findByWorkspaceId(db, workspaceId);

  return {
    folders: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
};
