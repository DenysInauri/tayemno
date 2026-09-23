import type {
  ICreateVaultRequest,
  ICreateVaultResponse,
  Vault,
} from "@tayemno/shared";
import type { Database } from "../../../db";
import { create as insertVault } from "../../../repositories/vaults";
import { findByFolderIdAndUserId } from "../../../repositories/folderKeyShares";
import { HttpError } from "../../../utils/httpError";

const mapVault = (row: { createdAt: Date; updatedAt: Date }): Vault =>
  ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }) as Vault;

export const createVault = async (
  db: Database,
  userId: string,
  data: ICreateVaultRequest,
): Promise<ICreateVaultResponse> => {
  const folderKeyShare = await findByFolderIdAndUserId(db, data.folderId, userId);

  if (!folderKeyShare) {
    throw new HttpError(403, "Access denied");
  }

  const vault = await insertVault(db, {
    ownerId: userId,
    folderId: data.folderId,
    name: data.name,
    mimeType: data.mimeType,
    extension: data.extension,
    sizeBytes: data.sizeBytes,
    s3Key: data.s3Key,
    contentNonce: data.contentNonce,
    symmetricKey: data.symmetricKey,
  });

  return { vault: mapVault(vault) };
};
