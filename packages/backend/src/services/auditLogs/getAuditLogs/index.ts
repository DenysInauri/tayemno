import type { Database } from "../../../db";
import type { IGetAuditLogsResponse } from "@tayemno/shared";
import * as auditLogsRepo from "../../../repositories/auditLogs";
import { findFiltered } from "../../../repositories/auditLogs/findFiltered";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const toISO = (val: Date | string): string =>
  val instanceof Date ? val.toISOString() : val;

export const getAuditLogs = async (
  db: Database,
  workspaceId: string,
  folderId: string | undefined,
  vaultId: string | undefined,
  cursor: string | undefined,
  limit: number | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined,
  actionType: string | undefined,
  userId: string | undefined,
): Promise<IGetAuditLogsResponse> => {
  const effectiveLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const hasPageFilters = dateFrom || dateTo || actionType || userId;

  if (vaultId && !hasPageFilters) {
    const result = await auditLogsRepo.findByVaultId(
      db,
      workspaceId,
      vaultId,
      cursor ?? null,
      effectiveLimit,
    );
    return {
      logs: result.logs.map((r: any) => ({ ...r, createdAt: toISO(r.createdAt) })),
      nextCursor: result.nextCursor,
    };
  }

  if (!hasPageFilters) {
    const result = await auditLogsRepo.findByFolderId(
      db,
      workspaceId,
      folderId ?? null,
      cursor ?? null,
      effectiveLimit,
    );
    return {
      logs: result.logs.map((r: any) => ({ ...r, createdAt: toISO(r.createdAt) })),
      nextCursor: result.nextCursor,
    };
  }

  const result = await findFiltered(db, {
    workspaceId,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    actionTypes: actionType ? actionType.split(",") : null,
    userId: userId ?? null,
    cursor: cursor ?? null,
    limit: effectiveLimit,
  });

  return {
    logs: result.logs.map((r: any) => ({ ...r, createdAt: toISO(r.createdAt) })),
    nextCursor: result.nextCursor,
  };
};
