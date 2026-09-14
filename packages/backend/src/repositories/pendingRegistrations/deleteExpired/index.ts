import { lt } from "drizzle-orm";
import type { Database } from "../../../db";
import { pendingRegistrations } from "../../../db/schema.js";

export const deleteExpired = async (db: Database) => {
  await db
    .delete(pendingRegistrations)
    .where(lt(pendingRegistrations.codeExpiresAt, new Date()));
};
