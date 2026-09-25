import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IPresignVaultRequest, IPresignVaultResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import type { S3 } from "../../../utils/s3";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import { HttpError } from "../../../utils/httpError";

export const presignVault = async (
  s3: S3,
  bucket: string,
  db: Database,
  userId: string,
  data: IPresignVaultRequest,
): Promise<IPresignVaultResponse> => {
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

  const s3Key = `vaults/${crypto.randomUUID()}/${data.fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: "application/octet-stream",
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return { presignedUrl, s3Key };
};
