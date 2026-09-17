import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { folderKeyShares, folders } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof folderKeyShares.$inferInsert,
) => {
  const result = await db.insert(folderKeyShares).values(data).returning();
  return result[0];
};

export const findWithFoldersByUserId = async (
  db: Database,
  userId: string,
) => {
  return db
    .select({
      id: folders.id,
      ownerId: folders.ownerId,
      name: folders.name,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt,
      symmetricKey: folderKeyShares.symmetricKey,
    })
    .from(folderKeyShares)
    .innerJoin(folders, eq(folderKeyShares.folderId, folders.id))
    .where(eq(folderKeyShares.userId, userId));
};
