import type { Database } from "../../db";
import { vaults } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof vaults.$inferInsert,
) => {
  const result = await db.insert(vaults).values(data).returning();
  return result[0];
};
