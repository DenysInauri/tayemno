import { eq } from "drizzle-orm";
import type { Database } from "../../../db";
import { pendingRegistrations } from "../../../db/schema.js";

export const deleteByEmail = async (db: Database, email: string) => {
  await db
    .delete(pendingRegistrations)
    .where(eq(pendingRegistrations.email, email));
};
