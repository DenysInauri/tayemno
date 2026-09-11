import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { users } from "../../db/schema.js";

export const findByUsername = async (db: Database, username: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return result[0];
};
