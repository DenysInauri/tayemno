import type { ICheckEmailResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import { findByEmail } from "../../../repositories/users";

export const isEmailFree = async (
  db: Database,
  email: string,
): Promise<ICheckEmailResponse> => {
  const user = await findByEmail(db, email);
  return { isFree: !user };
};
