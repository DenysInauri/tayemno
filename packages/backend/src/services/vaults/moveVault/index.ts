import type { IMoveVaultRequest, IMoveVaultResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as vaultsRepo from "../../../repositories/vaults";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const moveVault = async (
  db: Database,
  userId: string,
  vaultId: string,
  data: IMoveVaultRequest,
): Promise<IMoveVaultResponse> => {
  const vault = await vaultsRepo.findById(db, vaultId);

  if (!vault) {
    throw new HttpError(404, "Vault not found");
  }

  if (vault.folderId) {
    const membership = await folderMembersRepo.findByFolderIdAndUserId(
      db,
      vault.folderId,
      userId,
    );
    if (!membership) throw new HttpError(403, "Access denied");
  } else {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      vault.workspaceId,
      userId,
    );
    if (!membership) throw new HttpError(403, "Access denied");
  }

  if (data.targetFolderId) {
    const membership = await folderMembersRepo.findByFolderIdAndUserId(
      db,
      data.targetFolderId,
      userId,
    );
    if (!membership) throw new HttpError(403, "Access denied to target folder");
  } else {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      vault.workspaceId,
      userId,
    );
    if (!membership) throw new HttpError(403, "Access denied");
  }

  if (vault.folderId === data.targetFolderId) {
    throw new HttpError(400, "Vault is already in this folder");
  }

  const updated = await vaultsRepo.updateMove(db, vaultId, {
    folderId: data.targetFolderId,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
    symmetricKeyNonce: data.symmetricKeyNonce,
  });

  if (!updated) {
    throw new HttpError(500, "Failed to move vault");
  }

  return { vault: mapTimestamps(updated) };
};
