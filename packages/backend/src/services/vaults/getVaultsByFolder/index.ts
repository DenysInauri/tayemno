import type {
  IGetVaultsByFolderResponse,
  IFolderPermissions,
  Vault,
} from "@tayemno/shared";
import type { Database } from "../../../db";
import * as vaultsRepo from "../../../repositories/vaults";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";

const ALL_PERMISSIONS: IFolderPermissions = {
  canView: true,
  canDownload: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canManageMembers: true,
};

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

  let permissions: IFolderPermissions;
  if (folderId) {
    permissions = (await folderAclsRepo.getPermissionsForFolder(db, folderId, userId))!;
  } else {
    const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(db, workspaceId, userId);
    const isAdmin = member?.role === "owner" || member?.role === "admin";
    permissions = isAdmin
      ? ALL_PERMISSIONS
      : { canView: true, canDownload: true, canAdd: true, canEdit: true, canDelete: true, canManageMembers: false };
  }

  return {
    vaults: (rows as any[]).map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    })) as Vault[],
    permissions,
  };
};
