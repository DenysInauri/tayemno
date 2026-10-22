import { sql, type SQL } from "drizzle-orm";
import type { Database } from "../../../db";
import { paginate } from "../index";

interface IFilterParams {
  workspaceId: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  actionTypes?: string[] | null;
  userId?: string | null;
  cursor?: string | null;
  limit: number;
}

export const findFiltered = async (db: Database, params: IFilterParams) => {
  const conditions: SQL[] = [];

  if (params.dateFrom) {
    conditions.push(sql`AND al.created_at >= ${params.dateFrom}`);
  }
  if (params.dateTo) {
    conditions.push(sql`AND al.created_at <= ${params.dateTo}`);
  }
  if (params.actionTypes && params.actionTypes.length > 0) {
    const values = params.actionTypes.map((a) => sql`${a}`);
    conditions.push(sql`AND al.action_type IN (${sql.join(values, sql`, `)})`);
  }
  if (params.userId) {
    conditions.push(sql`AND al.user_id = ${params.userId}`);
  }
  if (params.cursor) {
    conditions.push(sql`AND al.created_at < ${params.cursor}`);
  }

  const where = conditions.length > 0
    ? sql.join(conditions, sql` `)
    : sql``;

  const rows = await db.execute(sql`
    SELECT al.id, al.user_id AS "userId", al.action_type AS "actionType",
           al.folder_id AS "folderId", al.vault_id AS "vaultId",
           al.ip_address AS "ipAddress", al.encrypted_payload AS "encryptedPayload",
           al.payload_nonce AS "payloadNonce", al.encrypted_key AS "encryptedKey",
           al.created_at AS "createdAt"
    FROM audit_logs al
    WHERE al.workspace_id = ${params.workspaceId}
      ${where}
    ORDER BY al.created_at DESC
    LIMIT ${params.limit + 1}
  `);

  return paginate(rows, params.limit);
};
