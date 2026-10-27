import type { IUpdateFolderAclRoleRequest, IUpdateFolderAclRoleResponse } from "@tayemno/shared";
import { FOLDER_ROLE_PERMISSIONS } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const updateFolderAclRole = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  targetUserId: string,
  data: IUpdateFolderAclRoleRequest,
): Promise<IUpdateFolderAclRoleResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);
  if (!folder) throw new HttpError(404, "Folder not found");

  const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, requestingUserId);
  if (!permissions || !permissions.canManageMembers) {
    throw new HttpError(403, "Access denied");
  }

  if (data.role === "manager") {
    const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db, folder.workspaceId, requestingUserId,
    );
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "Only admins can assign Manager role");
    }
  }

  const targetPermissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, targetUserId);
  if (targetPermissions?.canManageMembers) {
    const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db, folder.workspaceId, requestingUserId,
    );
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "Only admins can change Manager role");
    }
  }

  const existingAcl = await folderAclsRepo.findByFolderIdAndUserId(db, folderId, targetUserId);
  if (!existingAcl) throw new HttpError(404, "Member has no direct access to this folder");

  const rolePermissions = FOLDER_ROLE_PERMISSIONS[data.role];
  await folderAclsRepo.updatePermissions(db, folderId, targetUserId, rolePermissions);

  return { message: "Role updated" };
};
