import { eq, and, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { folderAcls, folders, users } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof folderAcls.$inferInsert,
) => {
  const result = await db.insert(folderAcls).values(data).returning();
  return result[0];
};

export const findByFolderIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const result = await db
    .select()
    .from(folderAcls)
    .where(
      and(
        eq(folderAcls.folderId, folderId),
        eq(folderAcls.userId, userId),
      ),
    )
    .limit(1);

  return result[0];
};

export const findAllByFolderId = async (
  db: Database,
  folderId: string,
) => {
  return db
    .select({
      userId: folderAcls.userId,
      encryptedFolderKey: folderAcls.encryptedFolderKey,
      createdAt: folderAcls.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(folderAcls)
    .innerJoin(users, eq(folderAcls.userId, users.id))
    .where(eq(folderAcls.folderId, folderId));
};

export const findAllByFolderIdWithAncestors = async (
  db: Database,
  folderId: string,
) => {
  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_folder_id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id, f.parent_folder_id FROM folders f
      INNER JOIN ancestors a ON f.id = a.parent_folder_id
    )
    SELECT DISTINCT ON (fa.user_id)
      fa.user_id AS "userId",
      fa.folder_id AS "folderId",
      fa.created_at AS "createdAt",
      u.name,
      u.email,
      f.encrypted_name AS "encryptedName",
      f.name_nonce AS "nameNonce"
    FROM folder_acls fa
    INNER JOIN users u ON fa.user_id = u.id
    INNER JOIN folders f ON fa.folder_id = f.id
    WHERE fa.folder_id IN (SELECT id FROM ancestors)
    ORDER BY fa.user_id, fa.created_at ASC
  `);
  return rows as unknown as {
    userId: string;
    folderId: string;
    createdAt: Date;
    name: string;
    email: string;
    encryptedName: string;
    nameNonce: string;
  }[];
};

export const bulkCreate = async (
  db: Database,
  data: (typeof folderAcls.$inferInsert)[],
) => {
  const result = await db.insert(folderAcls).values(data).returning();
  return result;
};

export const findByUserIdAndWorkspaceId = async (
  db: Database,
  userId: string,
  workspaceId: string,
) => {
  return db
    .select({
      id: folderAcls.id,
      folderId: folderAcls.folderId,
      userId: folderAcls.userId,
      encryptedFolderKey: folderAcls.encryptedFolderKey,
      createdAt: folderAcls.createdAt,
      updatedAt: folderAcls.updatedAt,
    })
    .from(folderAcls)
    .innerJoin(folders, eq(folderAcls.folderId, folders.id))
    .where(
      and(
        eq(folderAcls.userId, userId),
        eq(folders.workspaceId, workspaceId),
      ),
    );
};

export const hasAccessToFolder = async (
  db: Database,
  folderId: string,
  userId: string,
): Promise<boolean> => {
  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_folder_id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id, f.parent_folder_id FROM folders f
      INNER JOIN ancestors a ON f.id = a.parent_folder_id
    )
    SELECT EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = (SELECT workspace_id FROM folders WHERE id = ${folderId})
      AND wm.user_id = ${userId}
      AND wm.role IN ('owner', 'admin')
    ) OR EXISTS (
      SELECT 1 FROM folder_acls fa
      WHERE fa.folder_id IN (SELECT id FROM ancestors)
      AND fa.user_id = ${userId}
    ) AS "hasAccess"
  `);
  return (rows as unknown as { hasAccess: boolean }[])[0]?.hasAccess ?? false;
};

export const deleteByFolderIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  await db
    .delete(folderAcls)
    .where(
      and(
        eq(folderAcls.folderId, folderId),
        eq(folderAcls.userId, userId),
      ),
    );
};
