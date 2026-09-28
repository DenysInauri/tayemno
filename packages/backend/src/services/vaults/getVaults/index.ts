import type { Database } from "../../../db";
import type { IGetVaultsResponse } from "@tayemno/shared";
import { findByFolderId } from "../../../repositories/vaults";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import { HttpError } from "../../../utils/httpError";

export const getVaults = async (
  db: Database,
  userId: string,
  folderId: string,
): Promise<IGetVaultsResponse> => {
  const membership = await folderMembersRepo.findByFolderIdAndUserId(
    db,
    folderId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await findByFolderId(db, folderId);

  return {
    vaults: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
};
