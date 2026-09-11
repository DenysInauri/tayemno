import type { ICheckUsernameResponse } from "@tayemno/shared";
import type { Database } from "../../db";
import { findByUsername } from "../../repositories/users";

export const isUsernameFree = async (
  db: Database,
  username: string,
): Promise<ICheckUsernameResponse> => {
  const user = await findByUsername(db, username);
  return { isFree: !user };
};
