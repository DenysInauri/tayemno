import { eq, and } from "drizzle-orm";
import type { Database } from "../../db";
import { workspaceMembers, users } from "../../db/schema.js";

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

export const findAllByWorkspaceId = async (
  db: Database,
  workspaceId: string,
) => {
  return db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      adminEncryptedUserPrivateKey: workspaceMembers.adminEncryptedUserPrivateKey,
      createdAt: workspaceMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
};

export const findById = async (db: Database, id: string) => {
  const result = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.id, id))
    .limit(1);

  return result[0];
};

export const updateStatusByUserId = async (
  db: Database,
  userId: string,
  status: string,
) => {
  await db
    .update(workspaceMembers)
    .set({ status })
    .where(eq(workspaceMembers.userId, userId));
};
