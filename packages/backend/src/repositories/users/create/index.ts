import type { Database } from "../../../db";
import { users } from "../../../db/schema.js";

export const create = async (db: Database, data: typeof users.$inferInsert) => {
  const result = await db.insert(users).values(data).returning();

  return result[0];
};
