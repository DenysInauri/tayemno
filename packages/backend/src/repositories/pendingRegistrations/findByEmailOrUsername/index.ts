import { eq, or } from "drizzle-orm";
import type { Database } from "../../../db";
import { pendingRegistrations } from "../../../db/schema.js";

export const findByEmailOrUsername = async (
  db: Database,
  email: string,
  username: string,
) => {
  const result = await db
    .select()
    .from(pendingRegistrations)
    .where(
      or(
        eq(pendingRegistrations.email, email),
        eq(pendingRegistrations.username, username),
      ),
    );

  return result;
};
