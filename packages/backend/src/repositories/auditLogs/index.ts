import { sql } from "drizzle-orm";
import type { Database } from "../../db";
import { auditLogs } from "../../db/schema.js";

interface ICreateParams {
  workspaceId: string;
  folderId: string | null;
  vaultId?: string | null;
  ipAddress: string | null;
  encryptedPayload: string;
  payloadNonce: string;
  encryptedKey: string;
}

const paginate = (rows: unknown, limit: number) => {
  const results = rows as any[];
  const hasMore = results.length > limit;
  const logs = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore
    ? (logs[logs.length - 1].createdAt instanceof Date
        ? logs[logs.length - 1].createdAt.toISOString()
        : logs[logs.length - 1].createdAt)
    : null;
  return { logs, nextCursor };
};

export const create = async (db: Database, data: ICreateParams) => {
  const result = await db
    .insert(auditLogs)
    .values({
      workspaceId: data.workspaceId,
      folderId: data.folderId,
      vaultId: data.vaultId ?? null,
      ipAddress: data.ipAddress,
      encryptedPayload: data.encryptedPayload,
      payloadNonce: data.payloadNonce,
      encryptedKey: data.encryptedKey,
    })
    .returning();
  return result[0];
};

export const findByFolderId = async (
  db: Database,
  workspaceId: string,
  folderId: string | null,
  cursor: string | null,
  limit: number,
) => {
  const cursorCondition = cursor
    ? sql`AND al.created_at < ${cursor}`
    : sql``;

  const folderCte = folderId
    ? sql`
    WITH RECURSIVE descendant_folders AS (
      SELECT id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN descendant_folders df ON f.parent_folder_id = df.id
    )`
    : sql``;

  const folderCondition = folderId
    ? sql`AND al.folder_id IN (SELECT id FROM descendant_folders)`
    : sql``;

  const rows = await db.execute(sql`
    ${folderCte}
    SELECT al.id, al.folder_id AS "folderId", al.vault_id AS "vaultId",
           al.ip_address AS "ipAddress", al.encrypted_payload AS "encryptedPayload",
           al.payload_nonce AS "payloadNonce", al.encrypted_key AS "encryptedKey",
           al.created_at AS "createdAt"
    FROM audit_logs al
    WHERE al.workspace_id = ${workspaceId}
      ${folderCondition}
      ${cursorCondition}
    ORDER BY al.created_at DESC
    LIMIT ${limit + 1}
  `);

  return paginate(rows, limit);
};

export const findByVaultId = async (
  db: Database,
  workspaceId: string,
  vaultId: string,
  cursor: string | null,
  limit: number,
) => {
  const cursorCondition = cursor
    ? sql`AND al.created_at < ${cursor}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT al.id, al.folder_id AS "folderId", al.vault_id AS "vaultId",
           al.ip_address AS "ipAddress", al.encrypted_payload AS "encryptedPayload",
           al.payload_nonce AS "payloadNonce", al.encrypted_key AS "encryptedKey",
           al.created_at AS "createdAt"
    FROM audit_logs al
    WHERE al.workspace_id = ${workspaceId}
      AND al.vault_id = ${vaultId}
      ${cursorCondition}
    ORDER BY al.created_at DESC
    LIMIT ${limit + 1}
  `);

  return paginate(rows, limit);
};
