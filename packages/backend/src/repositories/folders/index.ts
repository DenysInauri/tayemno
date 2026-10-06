import { eq, and, sql, isNull, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { folders, folderMembers } from "../../db/schema.js";

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
      encryptedName: folders.encryptedName,
      nameNonce: folders.nameNonce,
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
      encryptedName: folders.encryptedName,
      nameNonce: folders.nameNonce,
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
    );
};

export const findDescendantVaultS3Keys = async (
  db: Database,
  folderId: string,
): Promise<string[]> => {
  const rows = await db.execute(sql`
    WITH RECURSIVE descendant_folders AS (
      SELECT id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN descendant_folders df ON f.parent_folder_id = df.id
    )
    SELECT v.s3_key AS "s3Key"
    FROM vaults v
    WHERE v.folder_id IN (SELECT id FROM descendant_folders)
  `);
  return (rows as unknown as { s3Key: string }[]).map((r) => r.s3Key);
};

export const findDescendantIds = async (
  db: Database,
  folderId: string,
): Promise<string[]> => {
  const rows = await db.execute(sql`
    WITH RECURSIVE descendant_folders AS (
      SELECT id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN descendant_folders df ON f.parent_folder_id = df.id
    )
    SELECT id FROM descendant_folders
  `);
  return (rows as unknown as { id: string }[]).map((r) => r.id);
};

export const deleteByIds = async (
  db: Database,
  ids: string[],
) => {
  await db.delete(folders).where(inArray(folders.id, ids));
};

export const findAllByUser = async (
  db: Database,
  workspaceId: string,
  userId: string,
) => {
  return db
    .select({
      id: folders.id,
      workspaceId: folders.workspaceId,
      encryptedName: folders.encryptedName,
      nameNonce: folders.nameNonce,
      encryptedSymmetricKey: folderMembers.encryptedSymmetricKey,
      parentFolderId: folders.parentFolderId,
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
    );
};
