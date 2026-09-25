import { eq, and, asc, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { folders, folderMembers } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof folders.$inferInsert,
) => {
  const result = await db.insert(folders).values(data).returning();
  return result[0];
};

export const findByWorkspaceIdAndUserId = async (
  db: Database,
  workspaceId: string,
  userId: string,
) => {
  return db
    .select({
      id: folders.id,
      workspaceId: folders.workspaceId,
      name: folders.name,
      encryptedSymmetricKey: folderMembers.encryptedSymmetricKey,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt,
    })
    .from(folderMembers)
    .innerJoin(folders, eq(folderMembers.folderId, folders.id))
    .where(
      and(
        eq(folders.workspaceId, workspaceId),
        eq(folderMembers.userId, userId),
      ),
    )
    .orderBy(
      asc(sql`regexp_replace(lower(${folders.name}), '\\d', '', 'g')`),
      asc(
        sql`COALESCE(NULLIF(regexp_replace(${folders.name}, '\\D', '', 'g'), ''), '0')::bigint`,
      ),
    );
};
