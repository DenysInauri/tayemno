import srp from "secure-remote-password/server";
import type { ISignInInitRequest, ISignInInitResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import { findByUsername } from "../../../repositories/users";
import { setSrpChallenge } from "../../../utils/srpChallengeStore";
import { HttpError } from "../../../utils/httpError";

export const signInInit = async (
  db: Database,
  data: ISignInInitRequest,
): Promise<ISignInInitResponse> => {
  const username = data.username.toLowerCase();

  const user = await findByUsername(db, username);

  if (!user || !user.emailVerified) {
    throw new HttpError(401, "Invalid credentials");
  }

  const serverEphemeral = srp.generateEphemeral(user.srpVerifier);

  setSrpChallenge(username, serverEphemeral.secret);

  return {
    srpSalt: user.srpSalt,
    serverPublicEphemeral: serverEphemeral.public,
  };
};
