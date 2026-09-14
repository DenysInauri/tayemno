import { eq } from "drizzle-orm";
import type { Database } from "../../../db";
import { pendingRegistrations } from "../../../db/schema.js";

export const findByEmail = async (db: Database, email: string) => {
  const result = await db
    .select()
    .from(pendingRegistrations)
    .where(eq(pendingRegistrations.email, email))
    .limit(1);

  return result[0];
};
