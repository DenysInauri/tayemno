import type { IChangePasswordRequest } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as usersRepo from "../../../repositories/users";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  userId: string;
  data: IChangePasswordRequest;
}

export const changePassword = async ({ db, userId, data }: IParams) => {
  const user = await usersRepo.findById(db, userId);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  await usersRepo.update(db, userId, {
    srpSalt: data.srpSalt,
    srpVerifier: data.srpVerifier,
    kdfSalt: data.kdfSalt,
    kdfAlgorithm: data.kdfAlgorithm,
    kdfMemoryKib: data.kdfMemoryKib,
    kdfIterations: data.kdfIterations,
    kdfParallelism: data.kdfParallelism,
    encryptedPrivateKey: data.encryptedPrivateKey,
    privateKeyNonce: data.privateKeyNonce,
    forcePasswordChange: false,
  });

  await workspaceMembersRepo.updateStatusByUserId(db, userId, "active");

  return { message: "Password changed successfully" };
};
