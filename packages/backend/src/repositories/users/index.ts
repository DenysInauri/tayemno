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

export const findByEmail = async (db: Database, email: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0];
};

export const create = async (db: Database, data: typeof users.$inferInsert) => {
  const result = await db.insert(users).values(data).returning();

  return result[0];
};
