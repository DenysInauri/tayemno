import type { IDeleteFolderAclResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const deleteFolderAcl = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  targetUserId: string,
): Promise<IDeleteFolderAclResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, requestingUserId);
  if (!permissions || !permissions.canManageMembers) {
    throw new HttpError(403, "Access denied");
  }

  const targetPermissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, targetUserId);
  if (targetPermissions?.canManageMembers) {
    const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db, folder.workspaceId, requestingUserId,
    );
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "Only admins can remove Managers");
    }
  }

  await folderAclsRepo.deleteByFolderIdAndUserId(db, folderId, targetUserId);

  return { message: "Access revoked" };
};
