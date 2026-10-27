import { eq, and, sql } from "drizzle-orm";
import type { IFolderPermissions } from "@tayemno/shared";
import type { Database } from "../../db";
import { folderAcls, folders, users } from "../../db/schema.js";

const ALL_PERMISSIONS: IFolderPermissions = {
  canView: true,
  canDownload: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canManageMembers: true,
};

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
      f.name_nonce AS "nameNonce",
      wm.role AS "workspaceRole",
      fa.can_view AS "canView",
      fa.can_download AS "canDownload",
      fa.can_add AS "canAdd",
      fa.can_edit AS "canEdit",
      fa.can_delete AS "canDelete",
      fa.can_manage_members AS "canManageMembers"
    FROM folder_acls fa
    INNER JOIN users u ON fa.user_id = u.id
    INNER JOIN folders f ON fa.folder_id = f.id
    INNER JOIN workspace_members wm
      ON wm.user_id = fa.user_id
      AND wm.workspace_id = f.workspace_id
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
    workspaceRole: string;
    canView: boolean;
    canDownload: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
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
      canView: folderAcls.canView,
      canDownload: folderAcls.canDownload,
      canAdd: folderAcls.canAdd,
      canEdit: folderAcls.canEdit,
      canDelete: folderAcls.canDelete,
      canManageMembers: folderAcls.canManageMembers,
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

export const getPermissionsForFolder = async (
  db: Database,
  folderId: string,
  userId: string,
): Promise<IFolderPermissions | null> => {
  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_folder_id, 0 AS depth FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id, f.parent_folder_id, a.depth + 1
      FROM folders f
      INNER JOIN ancestors a ON f.id = a.parent_folder_id
    )
    SELECT
      wm.role AS "workspaceRole",
      na.can_view AS "canView",
      na.can_download AS "canDownload",
      na.can_add AS "canAdd",
      na.can_edit AS "canEdit",
      na.can_delete AS "canDelete",
      na.can_manage_members AS "canManageMembers"
    FROM workspace_members wm
    LEFT JOIN LATERAL (
      SELECT fa.can_view, fa.can_download, fa.can_add, fa.can_edit,
             fa.can_delete, fa.can_manage_members
      FROM folder_acls fa
      INNER JOIN ancestors a ON fa.folder_id = a.id
      WHERE fa.user_id = ${userId}
      ORDER BY a.depth ASC
      LIMIT 1
    ) na ON true
    WHERE wm.workspace_id = (SELECT workspace_id FROM folders WHERE id = ${folderId})
      AND wm.user_id = ${userId}
  `);

  const row = (rows as unknown as {
    workspaceRole: string;
    canView: boolean | null;
    canDownload: boolean | null;
    canAdd: boolean | null;
    canEdit: boolean | null;
    canDelete: boolean | null;
    canManageMembers: boolean | null;
  }[])[0];

  if (!row) return null;

  if (row.workspaceRole === "owner" || row.workspaceRole === "admin") {
    return ALL_PERMISSIONS;
  }

  if (row.canView === null) return null;

  return {
    canView: row.canView,
    canDownload: row.canDownload!,
    canAdd: row.canAdd!,
    canEdit: row.canEdit!,
    canDelete: row.canDelete!,
    canManageMembers: row.canManageMembers!,
  };
};

export const updatePermissions = async (
  db: Database,
  folderId: string,
  userId: string,
  permissions: IFolderPermissions,
) => {
  await db
    .update(folderAcls)
    .set({
      canView: permissions.canView,
      canDownload: permissions.canDownload,
      canAdd: permissions.canAdd,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      canManageMembers: permissions.canManageMembers,
    })
    .where(
      and(
        eq(folderAcls.folderId, folderId),
        eq(folderAcls.userId, userId),
      ),
    );
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
