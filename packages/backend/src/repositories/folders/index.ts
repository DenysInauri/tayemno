import { eq, sql, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { folders } from "../../db/schema.js";

export const findByIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const rows = await db.execute(sql`
    SELECT f.id, f.workspace_id AS "workspaceId", f.parent_folder_id AS "parentFolderId",
           f.encrypted_name AS "encryptedName", f.name_nonce AS "nameNonce",
           f.encrypted_symmetric_key AS "encryptedSymmetricKey",
           f.wrapped_key AS "wrappedKey", f.wrapped_key_nonce AS "wrappedKeyNonce",
           f.created_at AS "createdAt", f.updated_at AS "updatedAt"
    FROM folders f
    WHERE f.id = ${folderId}
    AND (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = f.workspace_id AND wm.user_id = ${userId}
        AND wm.role IN ('owner', 'admin')
      )
      OR EXISTS (
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_folder_id FROM folders WHERE id = ${folderId}
          UNION ALL
          SELECT fp.id, fp.parent_folder_id FROM folders fp
          INNER JOIN ancestors a ON fp.id = a.parent_folder_id
        )
        SELECT 1 FROM folder_acls fa
        WHERE fa.folder_id IN (SELECT id FROM ancestors) AND fa.user_id = ${userId}
      )
    )
  `);
  return (rows as unknown as any[])[0] ?? null;
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
  const parentCondition = parentFolderId != null
    ? sql`f.parent_folder_id = ${parentFolderId}`
    : sql`f.parent_folder_id IS NULL`;

  const rows = await db.execute(sql`
    WITH RECURSIVE accessible AS (
      SELECT fa_f.id FROM folders fa_f
      INNER JOIN folder_acls fa ON fa.folder_id = fa_f.id
      WHERE fa.user_id = ${userId} AND fa_f.workspace_id = ${workspaceId}
      UNION ALL
      SELECT child.id FROM folders child
      INNER JOIN accessible a ON child.parent_folder_id = a.id
    )
    SELECT f.id, f.workspace_id AS "workspaceId", f.parent_folder_id AS "parentFolderId",
           f.encrypted_name AS "encryptedName", f.name_nonce AS "nameNonce",
           f.encrypted_symmetric_key AS "encryptedSymmetricKey",
           f.wrapped_key AS "wrappedKey", f.wrapped_key_nonce AS "wrappedKeyNonce",
           f.created_at AS "createdAt", f.updated_at AS "updatedAt"
    FROM folders f
    WHERE f.workspace_id = ${workspaceId}
    AND ${parentCondition}
    AND (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${userId}
        AND wm.role IN ('owner', 'admin')
      )
      OR f.id IN (SELECT id FROM accessible)
    )
  `);
  return rows as unknown as any[];
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

export const findBreadcrumbs = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT f.id, f.workspace_id, f.parent_folder_id, f.encrypted_name, f.name_nonce,
             f.encrypted_symmetric_key, f.wrapped_key, f.wrapped_key_nonce,
             f.created_at, f.updated_at, 0 AS depth
      FROM folders f
      WHERE f.id = ${folderId}
      UNION ALL
      SELECT f.id, f.workspace_id, f.parent_folder_id, f.encrypted_name, f.name_nonce,
             f.encrypted_symmetric_key, f.wrapped_key, f.wrapped_key_nonce,
             f.created_at, f.updated_at, a.depth + 1
      FROM folders f
      INNER JOIN ancestors a ON f.id = a.parent_folder_id
    )
    SELECT id, workspace_id AS "workspaceId", parent_folder_id AS "parentFolderId",
           encrypted_name AS "encryptedName", name_nonce AS "nameNonce",
           encrypted_symmetric_key AS "encryptedSymmetricKey",
           wrapped_key AS "wrappedKey", wrapped_key_nonce AS "wrappedKeyNonce",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM ancestors
    ORDER BY depth DESC
  `);
  return rows as unknown as any[];
};

export const findAllByUser = async (
  db: Database,
  workspaceId: string,
  userId: string,
) => {
  const rows = await db.execute(sql`
    WITH RECURSIVE accessible AS (
      SELECT fa_f.id FROM folders fa_f
      INNER JOIN folder_acls fa ON fa.folder_id = fa_f.id
      WHERE fa.user_id = ${userId} AND fa_f.workspace_id = ${workspaceId}
      UNION ALL
      SELECT child.id FROM folders child
      INNER JOIN accessible a ON child.parent_folder_id = a.id
    )
    SELECT f.id, f.workspace_id AS "workspaceId", f.parent_folder_id AS "parentFolderId",
           f.encrypted_name AS "encryptedName", f.name_nonce AS "nameNonce",
           f.encrypted_symmetric_key AS "encryptedSymmetricKey",
           f.wrapped_key AS "wrappedKey", f.wrapped_key_nonce AS "wrappedKeyNonce",
           f.created_at AS "createdAt", f.updated_at AS "updatedAt"
    FROM folders f
    WHERE f.workspace_id = ${workspaceId}
    AND (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${userId}
        AND wm.role IN ('owner', 'admin')
      )
      OR f.id IN (SELECT id FROM accessible)
    )
  `);
  return rows as unknown as any[];
};

export const updateMove = async (
  db: Database,
  folderId: string,
  data: {
    parentFolderId: string | null;
    wrappedKey: string | null;
    wrappedKeyNonce: string | null;
    encryptedSymmetricKey: string;
  },
) => {
  const result = await db
    .update(folders)
    .set({
      parentFolderId: data.parentFolderId,
      wrappedKey: data.wrappedKey,
      wrappedKeyNonce: data.wrappedKeyNonce,
      encryptedSymmetricKey: data.encryptedSymmetricKey,
    })
    .where(eq(folders.id, folderId))
    .returning();

  return result[0] ?? null;
};
