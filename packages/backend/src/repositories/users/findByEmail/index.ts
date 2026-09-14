import { eq } from "drizzle-orm";
import type { Database } from "../../../db";
import { users } from "../../../db/schema.js";

export const findByEmail = async (db: Database, email: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0];
};
