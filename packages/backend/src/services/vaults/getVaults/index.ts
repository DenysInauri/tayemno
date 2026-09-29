import type { Database } from "../../../db";
import type { IGetVaultsResponse } from "@tayemno/shared";
import {
  findByFolderId,
  findByWorkspaceIdRootLevel,
} from "../../../repositories/vaults";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

interface IRow {
  createdAt: Date;
  updatedAt: Date;
}

function transformRows<I extends IRow>(rows: I[]) {
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export const getVaults = async (
  db: Database,
  userId: string,
  folderId?: string,
  workspaceId?: string,
): Promise<IGetVaultsResponse> => {
  if (folderId) {
    const membership = await folderMembersRepo.findByFolderIdAndUserId(
      db,
      folderId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "Access denied");
    }

    const rows = await findByFolderId(db, folderId);

    return { vaults: transformRows(rows) };
  }

  if (workspaceId) {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "Access denied");
    }

    const rows = await findByWorkspaceIdRootLevel(db, workspaceId);
    return { vaults: transformRows(rows) };
  }

  throw new HttpError(400, "Either folderId or workspaceId is required");
};
