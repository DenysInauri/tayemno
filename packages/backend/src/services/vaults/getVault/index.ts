import type { IGetVaultResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as vaultsRepo from "../../../repositories/vaults";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getVault = async (
  db: Database,
  userId: string,
  vaultId: string,
): Promise<IGetVaultResponse> => {
  const vault = await vaultsRepo.findById(db, vaultId);

  if (!vault) {
    throw new HttpError(404, "Vault not found");
  }

  if (vault.folderId) {
    const membership = await folderAclsRepo.findByFolderIdAndUserId(
      db,
      vault.folderId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "Access denied");
    }
  } else {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      vault.workspaceId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "Access denied");
    }
  }

  return { vault: mapTimestamps(vault) };
};
