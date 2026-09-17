import type { Database } from "../../db";
import { folders } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof folders.$inferInsert,
) => {
  const result = await db.insert(folders).values(data).returning();
  return result[0];
};
