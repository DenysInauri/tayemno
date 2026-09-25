import { eq, and } from "drizzle-orm";
import type { Database } from "../../db";
import { workspaceMembers } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof workspaceMembers.$inferInsert,
) => {
  const result = await db.insert(workspaceMembers).values(data).returning();
  return result[0];
};

export const findByUserId = async (db: Database, userId: string) => {
  const result = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  return result[0];
};

export const findByWorkspaceIdAndUserId = async (
  db: Database,
  workspaceId: string,
  userId: string,
) => {
  const result = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    );

  return result[0];
};
