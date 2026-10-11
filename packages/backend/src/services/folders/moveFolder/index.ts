import type { IMoveFolderRequest, IMoveFolderResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const moveFolder = async (
  db: Database,
  userId: string,
  folderId: string,
  data: IMoveFolderRequest,
): Promise<IMoveFolderResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, userId);

  if (!folder) {
    throw new HttpError(404, "Folder not found");
  }

  // Verify access to target location
  if (data.newParentFolderId) {
    const targetFolder = await foldersRepo.findByIdAndUserId(
      db,
      data.newParentFolderId,
      userId,
    );
    if (!targetFolder) {
      throw new HttpError(403, "Access denied to target folder");
    }
  } else {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      folder.workspaceId,
      userId,
    );
    if (!membership) {
      throw new HttpError(403, "Access denied");
    }
  }

  // Prevent moving to same parent
  if (folder.parentFolderId === data.newParentFolderId) {
    throw new HttpError(400, "Folder is already in this location");
  }

  // Prevent moving a folder into its own subtree
  if (data.newParentFolderId) {
    const descendantIds = await foldersRepo.findDescendantIds(db, folderId);
    if (descendantIds.includes(data.newParentFolderId)) {
      throw new HttpError(400, "Cannot move a folder into its own subtree");
    }
  }

  const updated = await foldersRepo.updateMove(db, folderId, {
    parentFolderId: data.newParentFolderId,
    wrappedKey: data.wrappedKey,
    wrappedKeyNonce: data.wrappedKeyNonce,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
  });

  if (!updated) {
    throw new HttpError(500, "Failed to move folder");
  }

  return { folder: mapTimestamps(updated) };
};
