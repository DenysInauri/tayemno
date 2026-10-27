import type { IGetFoldersByParentResponse, IFolderPermissions } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

const ALL_PERMISSIONS: IFolderPermissions = {
  canView: true,
  canDownload: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canManageMembers: true,
};

export const getFoldersByParent = async (
  db: Database,
  userId: string,
  workspaceId: string,
  parentFolderId: string | null,
): Promise<IGetFoldersByParentResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await foldersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
    parentFolderId,
  );

  let permissions: IFolderPermissions;
  if (parentFolderId) {
    permissions = (await folderAclsRepo.getPermissionsForFolder(db, parentFolderId, userId))!;
  } else {
    const isAdmin = membership.role === "owner" || membership.role === "admin";
    permissions = isAdmin
      ? ALL_PERMISSIONS
      : { canView: true, canDownload: true, canAdd: true, canEdit: true, canDelete: true, canManageMembers: false };
  }

  return {
    folders: rows.map(mapTimestamps) as IGetFoldersByParentResponse["folders"],
    permissions,
  };
};
