import { eq } from "drizzle-orm";
import type { Database } from "../../../db";
import { pendingRegistrations } from "../../../db/schema.js";

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
