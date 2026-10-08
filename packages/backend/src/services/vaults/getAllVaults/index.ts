import type { IGetAllVaultsResponse, Vault } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as vaultsRepo from "../../../repositories/vaults";

export const getAllVaults = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetAllVaultsResponse> => {
  const rows = await vaultsRepo.findAllByWorkspaceAndUser(
    db,
    workspaceId,
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
