import type {
  ICreateVaultRequest,
  ICreateVaultResponse,
  Vault,
} from "@tayemno/shared";
import type { Database } from "../../../db";
import { create as insertVault } from "../../../repositories/vaults";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import { HttpError } from "../../../utils/httpError";

const mapVault = (row: { createdAt: Date; updatedAt: Date }): Vault =>
  ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }) as Vault;

export const createVault = async (
  db: Database,
  userId: string,
  data: ICreateVaultRequest,
): Promise<ICreateVaultResponse> => {
  if (data.folderId) {
    const folderMembership = await folderMembersRepo.findByFolderIdAndUserId(
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
    name: data.name,
    mimeType: data.mimeType,
    extension: data.extension,
    sizeBytes: data.sizeBytes,
    s3Key: data.s3Key,
    contentNonce: data.contentNonce,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
    symmetricKeyNonce: data.symmetricKeyNonce || null,
  });

  return { vault: mapVault(vault) };
};
