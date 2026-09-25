import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { workspaces } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof workspaces.$inferInsert,
) => {
  const result = await db.insert(workspaces).values(data).returning();
  return result[0];
};

export const findById = async (db: Database, id: string) => {
  const result = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);
  return result[0];
};
