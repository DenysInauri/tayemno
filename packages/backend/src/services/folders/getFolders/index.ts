import type { Database } from "../../../db";
import type { IGetFoldersResponse } from "@tayemno/shared";
import { findWithFoldersByUserId } from "../../../repositories/folderKeyShares";

export const getFolders = async (
  db: Database,
  userId: string,
): Promise<IGetFoldersResponse> => {
  const rows = await findWithFoldersByUserId(db, userId);

  return {
    folders: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
};
