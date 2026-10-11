import { eq, and } from "drizzle-orm";
import type { Database } from "../../db";
import { folderAcls, folders } from "../../db/schema.js";

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
