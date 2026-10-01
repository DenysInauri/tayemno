import { eq, and, asc, sql, isNull } from "drizzle-orm";
import type { Database } from "../../db";
import { vaults } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof vaults.$inferInsert,
) => {
  const result = await db.insert(vaults).values(data).returning();
  return result[0];
};

export const findByFolderId = async (db: Database, folderId: string) => {
  return db
    .select()
    .from(vaults)
    .where(eq(vaults.folderId, folderId))
    .orderBy(
      asc(sql`regexp_replace(lower(${vaults.name}), '\\d', '', 'g')`),
      asc(
        sql`COALESCE(NULLIF(regexp_replace(${vaults.name}, '\\D', '', 'g'), ''), '0')::bigint`,
      ),
    );
};

export const findByWorkspaceIdRootLevel = async (
  db: Database,
  workspaceId: string,
) => {
  return db
    .select()
    .from(vaults)
    .where(and(eq(vaults.workspaceId, workspaceId), isNull(vaults.folderId)))
    .orderBy(
      asc(sql`regexp_replace(lower(${vaults.name}), '\\d', '', 'g')`),
      asc(
        sql`COALESCE(NULLIF(regexp_replace(${vaults.name}, '\\D', '', 'g'), ''), '0')::bigint`,
      ),
    );
};

export const findById = async (db: Database, vaultId: string) => {
  const result = await db
    .select()
    .from(vaults)
    .where(eq(vaults.id, vaultId))
    .limit(1);

  return result[0] ?? null;
};

export const deleteById = async (db: Database, vaultId: string) => {
  await db.delete(vaults).where(eq(vaults.id, vaultId));
};
