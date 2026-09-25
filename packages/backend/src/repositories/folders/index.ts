import { eq, asc, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { folders } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof folders.$inferInsert,
) => {
  const result = await db.insert(folders).values(data).returning();
  return result[0];
};

export const findByWorkspaceId = async (db: Database, workspaceId: string) => {
  return db
    .select()
    .from(folders)
    .where(eq(folders.workspaceId, workspaceId))
    .orderBy(
      asc(sql`regexp_replace(lower(${folders.name}), '\\d', '', 'g')`),
      asc(
        sql`COALESCE(NULLIF(regexp_replace(${folders.name}, '\\D', '', 'g'), ''), '0')::bigint`,
      ),
    );
};
