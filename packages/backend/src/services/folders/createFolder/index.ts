import type { Database } from "../../../db";
import type {
  ICreateFolderRequest,
  ICreateFolderResponse,
} from "@tayemno/shared";
import { create as insertFolder } from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const createFolder = async (
  db: Database,
  userId: string,
  workspaceId: string,
  data: ICreateFolderRequest,
): Promise<ICreateFolderResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  if (data.parentFolderId) {
    const hasParentAccess = await folderAclsRepo.hasAccessToFolder(
      db,
      data.parentFolderId,
      userId,
    );

    if (!hasParentAccess && membership.role === "member") {
      throw new HttpError(403, "Access denied to parent folder");
    }
  }

  const folder = await insertFolder(db, {
    workspaceId,
    encryptedName: data.encryptedName,
    nameNonce: data.nameNonce,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
    wrappedKey: data.wrappedKey ?? null,
    wrappedKeyNonce: data.wrappedKeyNonce ?? null,
    parentFolderId: data.parentFolderId ?? null,
  });

  await folderAclsRepo.create(db, {
    folderId: folder.id,
    userId,
    encryptedFolderKey: data.aclEncryptedFolderKey,
  });

  return { folder: mapTimestamps(folder) };
};
