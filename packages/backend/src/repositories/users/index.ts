import { eq, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { users } from "../../db/schema.js";

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

export const findById = async (db: Database, id: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0];
};

export const update = async (
  db: Database,
  id: string,
  data: Partial<typeof users.$inferInsert>,
) => {
  const result = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  return result[0];
};

export const deleteById = async (db: Database, id: string) => {
  await db.delete(users).where(eq(users.id, id));
};

export const deleteByIds = async (db: Database, ids: string[]) => {
  await db.delete(users).where(inArray(users.id, ids));
};
