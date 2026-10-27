import type {
  IBulkCreateFolderAclRequest,
  IBulkCreateFolderAclResponse,
} from "@tayemno/shared";
import { FOLDER_ROLE_PERMISSIONS } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const bulkCreateFolderAcl = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  data: IBulkCreateFolderAclRequest,
): Promise<IBulkCreateFolderAclResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, requestingUserId);
  if (!permissions || !permissions.canManageMembers) {
    throw new HttpError(403, "Access denied");
  }

  const hasManager = data.acls.some((acl) => acl.role === "manager");
  if (hasManager) {
    const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db, folder.workspaceId, requestingUserId,
    );
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "Only admins can assign Manager role");
    }
  }

  const existing = await folderAclsRepo.findAllByFolderId(db, folderId);
  const existingUserIds = new Set(existing.map((e) => e.userId));

  const newAcls = data.acls.filter((acl) => !existingUserIds.has(acl.userId));

  if (newAcls.length === 0) {
    return { acls: [] };
  }

  const rows = await folderAclsRepo.bulkCreate(
    db,
    newAcls.map((acl) => ({
      folderId,
      userId: acl.userId,
      encryptedFolderKey: acl.encryptedFolderKey,
      ...FOLDER_ROLE_PERMISSIONS[acl.role ?? "editor"],
    })),
  );

  return { acls: rows.map(mapTimestamps) };
};
