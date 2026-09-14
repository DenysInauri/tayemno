import type { Database } from "../../../db";
import { pendingRegistrations } from "../../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof pendingRegistrations.$inferInsert,
) => {
  const result = await db.insert(pendingRegistrations).values(data).returning();

  return result[0];
};
