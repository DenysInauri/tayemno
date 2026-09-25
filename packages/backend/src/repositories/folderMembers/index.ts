import { eq, and } from "drizzle-orm";
import type { Database } from "../../db";
import { folderMembers } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof folderMembers.$inferInsert,
) => {
  const result = await db.insert(folderMembers).values(data).returning();
  return result[0];
};

export const findByFolderIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const result = await db
    .select()
    .from(folderMembers)
    .where(
      and(
        eq(folderMembers.folderId, folderId),
        eq(folderMembers.userId, userId),
      ),
    )
    .limit(1);

  return result[0];
};
