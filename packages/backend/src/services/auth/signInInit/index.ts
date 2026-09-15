import srp from "secure-remote-password/server";
import type { ISignInInitRequest, ISignInInitResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import { findByUsernameOrEmail } from "../../../repositories/users";
import { setSrpChallenge } from "../../../utils/srpChallengeStore";
import { HttpError } from "../../../utils/httpError";

export const signInInit = async (
  db: Database,
  data: ISignInInitRequest,
): Promise<ISignInInitResponse> => {
  const identifier = data.identifier.toLowerCase();

  const user = await findByUsernameOrEmail(db, identifier);

  if (!user || !user.emailVerified) {
    throw new HttpError(401, "Invalid credentials");
  }

  const serverEphemeral = srp.generateEphemeral(user.srpVerifier);

  setSrpChallenge(user.username, serverEphemeral.secret);

  return {
    username: user.username,
    srpSalt: user.srpSalt,
    serverPublicEphemeral: serverEphemeral.public,
  };
};
