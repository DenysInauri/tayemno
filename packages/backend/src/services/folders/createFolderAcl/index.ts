import type { ICreateFolderAclRequest, ICreateFolderAclResponse } from "@tayemno/shared";
import { FOLDER_ROLE_PERMISSIONS } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const createFolderAcl = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  data: ICreateFolderAclRequest,
): Promise<ICreateFolderAclResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

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

  const existing = await folderAclsRepo.findByFolderIdAndUserId(db, folderId, data.userId);

  if (existing) {
    throw new HttpError(409, "User already has access to this folder");
  }

  const rolePermissions = FOLDER_ROLE_PERMISSIONS[data.role ?? "editor"];
  const acl = await folderAclsRepo.create(db, {
    folderId,
    userId: data.userId,
    encryptedFolderKey: data.encryptedFolderKey,
    ...rolePermissions,
  });

  return { acl: mapTimestamps(acl) };
};
