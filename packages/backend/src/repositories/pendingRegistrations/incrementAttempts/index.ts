import { eq } from "drizzle-orm";
import type { Database } from "../../../db";
import { pendingRegistrations } from "../../../db/schema.js";

export const incrementAttempts = async (db: Database, id: string) => {
  const record = await db
    .select({ attempts: pendingRegistrations.attempts })
    .from(pendingRegistrations)
    .where(eq(pendingRegistrations.id, id))
    .limit(1);

  if (!record[0]) return;

  await db
    .update(pendingRegistrations)
    .set({ attempts: record[0].attempts + 1 })
    .where(eq(pendingRegistrations.id, id));
};
