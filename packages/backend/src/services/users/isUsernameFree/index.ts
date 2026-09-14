import type { ICheckUsernameResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import { findByUsername } from "../../../repositories/users";
import { findByUsername as findPendingByUsername } from "../../../repositories/pendingRegistrations";

export const isUsernameFree = async (
  db: Database,
  username: string,
): Promise<ICheckUsernameResponse> => {
  const user = await findByUsername(db, username);
  if (user) return { isFree: false };

  const pending = await findPendingByUsername(db, username);
  return { isFree: !pending };
};
