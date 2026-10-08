import type { IGetVaultsByFolderResponse, Vault } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as vaultsRepo from "../../../repositories/vaults";

export const getVaultsByFolder = async (
  db: Database,
  userId: string,
  workspaceId: string,
  folderId: string | null,
): Promise<IGetVaultsByFolderResponse> => {
  const rows = await vaultsRepo.findByFolderAndUser(
    db,
    workspaceId,
    folderId,
    userId,
  );

  return {
    vaults: (rows as any[]).map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    })) as Vault[],
  };
};
