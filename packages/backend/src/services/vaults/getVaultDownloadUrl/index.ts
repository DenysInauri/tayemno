import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IGetVaultDownloadUrlResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import type { S3 } from "../../../utils/s3";
import * as vaultsRepo from "../../../repositories/vaults";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const getVaultDownloadUrl = async (
  s3: S3,
  bucket: string,
  db: Database,
  userId: string,
  vaultId: string,
): Promise<IGetVaultDownloadUrlResponse> => {
  const vault = await vaultsRepo.findById(db, vaultId);

  if (!vault) {
    throw new HttpError(404, "Vault not found");
  }

  if (vault.folderId) {
    const membership = await folderMembersRepo.findByFolderIdAndUserId(
      db,
      vault.folderId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "Access denied");
    }
  } else {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      vault.workspaceId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "Access denied");
    }
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: vault.s3Key,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return { presignedUrl };
};
