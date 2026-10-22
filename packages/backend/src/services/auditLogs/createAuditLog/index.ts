import type { Database } from "../../../db";
import type {
  ICreateAuditLogRequest,
  ICreateAuditLogResponse,
} from "@tayemno/shared";
import * as auditLogsRepo from "../../../repositories/auditLogs";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const createAuditLog = async (
  db: Database,
  userId: string,
  workspaceId: string,
  ipAddress: string,
  data: ICreateAuditLogRequest,
): Promise<ICreateAuditLogResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const log = await auditLogsRepo.create(db, {
    workspaceId,
    userId,
    actionType: data.actionType,
    folderId: data.folderId,
    vaultId: data.vaultId ?? null,
    ipAddress,
    encryptedPayload: data.encryptedPayload,
    payloadNonce: data.payloadNonce,
    encryptedKey: data.encryptedKey,
  });

  return {
    id: log.id,
    createdAt:
      log.createdAt instanceof Date
        ? log.createdAt.toISOString()
        : log.createdAt,
  };
};
