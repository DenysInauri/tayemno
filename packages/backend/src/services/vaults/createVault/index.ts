import type {
  ICreateVaultRequest,
  ICreateVaultResponse,
} from "@tayemno/shared";
import type { Database } from "../../../db";
import { create as insertVault } from "../../../repositories/vaults";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const createVault = async (
  db: Database,
  userId: string,
  data: ICreateVaultRequest,
): Promise<ICreateVaultResponse> => {
  if (data.folderId) {
    const folderMembership = await folderAclsRepo.findByFolderIdAndUserId(
      db,
      data.folderId,
      userId,
    );

    if (!folderMembership) {
      throw new HttpError(403, "Access denied");
    }
  } else {
    const workspaceMembership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      data.workspaceId,
      userId,
    );

    if (!workspaceMembership) {
      throw new HttpError(403, "Access denied");
    }
  }

  const vault = await insertVault(db, {
    workspaceId: data.workspaceId,
    folderId: data.folderId || null,
    encryptedName: data.encryptedName,
    nameNonce: data.nameNonce,
    encryptedMetadata: data.encryptedMetadata,
    metadataNonce: data.metadataNonce,
    s3Key: data.s3Key,
    contentNonce: data.contentNonce,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
    symmetricKeyNonce: data.symmetricKeyNonce || null,
  });

  return { vault: mapTimestamps(vault) };
};
