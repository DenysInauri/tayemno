import srp from "secure-remote-password/server";
import type {
  ISignInVerifyRequest,
  ISignInUserData,
  IWorkspaceData,
  WorkspaceRole,
} from "@tayemno/shared";
import type { Database } from "../../../db";
import { findByEmail } from "../../../repositories/users";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as workspacesRepo from "../../../repositories/workspaces";
import { getSrpChallenge } from "../../../utils/srpChallengeStore";
import { HttpError } from "../../../utils/httpError";

interface ISignInVerifyResult {
  serverSessionProof: string;
  user: ISignInUserData;
  workspace: IWorkspaceData;
}

export const signInVerify = async (
  db: Database,
  data: ISignInVerifyRequest,
): Promise<ISignInVerifyResult> => {
  const email = data.email.toLowerCase();

  const user = await findByEmail(db, email);

  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const serverSecretEphemeral = getSrpChallenge(email);

  if (!serverSecretEphemeral) {
    throw new HttpError(401, "SRP session expired or not found");
  }

  let serverSession;

  try {
    serverSession = srp.deriveSession(
      serverSecretEphemeral,
      data.clientPublicEphemeral,
      user.srpSalt,
      email,
      user.srpVerifier,
      data.clientSessionProof,
    );
  } catch {
    throw new HttpError(401, "Invalid credentials");
  }

  const membership = await workspaceMembersRepo.findByUserId(db, user.id);

  if (!membership) {
    throw new HttpError(500, "User has no workspace");
  }

  const workspace = await workspacesRepo.findById(db, membership.workspaceId);

  return {
    serverSessionProof: serverSession.proof,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      publicKey: user.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
      privateKeyNonce: user.privateKeyNonce,
      kdfSalt: user.kdfSalt,
      kdfAlgorithm: user.kdfAlgorithm as "argon2id",
      kdfMemoryKib: user.kdfMemoryKib,
      kdfIterations: user.kdfIterations,
      kdfParallelism: user.kdfParallelism,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      adminPublicKey: workspace.adminPublicKey,
      memberPublicKey: workspace.memberPublicKey,
      encryptedAdminPrivateKey: membership.encryptedAdminPrivateKey,
      encryptedMemberPrivateKey: membership.encryptedMemberPrivateKey,
      role: membership.role as WorkspaceRole,
    },
  };
};
