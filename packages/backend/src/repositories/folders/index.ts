import { eq, and, asc, sql, isNull } from "drizzle-orm";
import type { Database } from "../../db";
import { folders, folderMembers } from "../../db/schema.js";

export const findAncestors = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT f.id, f.name, f.parent_folder_id, 1 AS depth
      FROM folders f
      INNER JOIN folder_members fm ON fm.folder_id = f.id AND fm.user_id = ${userId}
      WHERE f.id = ${folderId}
      UNION ALL
      SELECT f.id, f.name, f.parent_folder_id, a.depth + 1
      FROM folders f
      INNER JOIN ancestors a ON f.id = a.parent_folder_id
      INNER JOIN folder_members fm ON fm.folder_id = f.id AND fm.user_id = ${userId}
    )
    SELECT id, name FROM ancestors ORDER BY depth DESC
  `);
  return rows as unknown as { id: string; name: string }[];
};

export const findByIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const result = await db
    .select({
      id: folders.id,
      workspaceId: folders.workspaceId,
      parentFolderId: folders.parentFolderId,
      name: folders.name,
      encryptedSymmetricKey: folderMembers.encryptedSymmetricKey,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt,
    })
    .from(folderMembers)
    .innerJoin(folders, eq(folderMembers.folderId, folders.id))
    .where(
      and(eq(folders.id, folderId), eq(folderMembers.userId, userId)),
    );
  return result[0] ?? null;
};

export const create = async (
  db: Database,
  data: typeof folders.$inferInsert,
) => {
  const result = await db.insert(folders).values(data).returning();
  return result[0];
};

export const findDescendantSizes = async (
  db: Database,
  folderId: string,
) => {
  const rows = await db.execute(sql`
    WITH RECURSIVE descendant_folders AS (
      SELECT id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN descendant_folders df ON f.parent_folder_id = df.id
    )
    SELECT
      COALESCE(SUM(v.size_bytes), 0)::bigint AS "sizeBytes",
      COALESCE(SUM(v.encrypted_size_bytes), 0)::bigint AS "encryptedSizeBytes"
    FROM vaults v
    WHERE v.folder_id IN (SELECT id FROM descendant_folders)
  `);
  return rows[0] as unknown as { sizeBytes: number; encryptedSizeBytes: number };
};

export const findByWorkspaceIdAndUserId = async (
  db: Database,
  workspaceId: string,
  userId: string,
  parentFolderId: string | null,
) => {
  return db
    .select({
      id: folders.id,
      workspaceId: folders.workspaceId,
      parentFolderId: folders.parentFolderId,
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
        parentFolderId != null
          ? eq(folders.parentFolderId, parentFolderId)
          : isNull(folders.parentFolderId),
      ),
    )
    .orderBy(
      asc(sql`regexp_replace(lower(${folders.name}), '\\d', '', 'g')`),
      asc(
        sql`COALESCE(NULLIF(regexp_replace(${folders.name}, '\\D', '', 'g'), ''), '0')::bigint`,
      ),
    );
};
