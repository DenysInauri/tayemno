import { eq, or, lt } from "drizzle-orm";
import type { Database } from "../../db";
import { pendingRegistrations } from "../../db/schema.js";

export const findByEmail = async (db: Database, email: string) => {
  const result = await db
    .select()
    .from(pendingRegistrations)
    .where(eq(pendingRegistrations.email, email))
    .limit(1);

  return result[0];
};

export const findByUsername = async (db: Database, username: string) => {
  const result = await db
    .select()
    .from(pendingRegistrations)
    .where(eq(pendingRegistrations.username, username))
    .limit(1);

  return result[0];
};

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

export const create = async (
  db: Database,
  data: typeof pendingRegistrations.$inferInsert,
) => {
  const result = await db.insert(pendingRegistrations).values(data).returning();

  return result[0];
};

export const deleteByEmail = async (db: Database, email: string) => {
  await db
    .delete(pendingRegistrations)
    .where(eq(pendingRegistrations.email, email));
};

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

export const updateVerificationCode = async (
  db: Database,
  id: string,
  hash: string,
  expiresAt: Date,
  lastSentAt: Date,
) => {
  await db
    .update(pendingRegistrations)
    .set({
      verificationCodeHash: hash,
      codeExpiresAt: expiresAt,
      lastSentAt,
      attempts: 0,
    })
    .where(eq(pendingRegistrations.id, id));
};

export const deleteExpired = async (db: Database) => {
  await db
    .delete(pendingRegistrations)
    .where(lt(pendingRegistrations.codeExpiresAt, new Date()));
};
