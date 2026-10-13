import type { IReinviteMemberRequest } from "@tayemno/shared";
import type { Transporter } from "nodemailer";
import type { Database } from "../../../db";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as usersRepo from "../../../repositories/users";
import { sendInviteEmail } from "../../email";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  workspaceId: string;
  memberId: string;
  data: IReinviteMemberRequest;
  mailTransport: Transporter;
  smtpFrom: string;
  frontendUrl: string;
}

export const reinviteMember = async ({
  db,
  workspaceId,
  memberId,
  data,
  mailTransport,
  smtpFrom,
  frontendUrl,
}: IParams) => {
  const target = await workspaceMembersRepo.findById(db, memberId);

  if (!target || target.workspaceId !== workspaceId) {
    throw new HttpError(404, "Member not found");
  }

  if (target.status !== "invited") {
    throw new HttpError(400, "Can only reinvite members with invited status");
  }

  const user = await usersRepo.findById(db, target.userId);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  await usersRepo.update(db, user.id, {
    srpSalt: data.srpSalt,
    srpVerifier: data.srpVerifier,
    kdfSalt: data.kdfSalt,
    kdfAlgorithm: data.kdfAlgorithm,
    kdfMemoryKib: data.kdfMemoryKib,
    kdfIterations: data.kdfIterations,
    kdfParallelism: data.kdfParallelism,
    encryptedPrivateKey: data.encryptedPrivateKey,
    privateKeyNonce: data.privateKeyNonce,
    forcePasswordChange: true,
  });

  await sendInviteEmail({
    transport: mailTransport,
    from: smtpFrom,
    to: user.email,
    workspaceName: data.workspaceName,
    tempPassword: data.tempPassword,
    frontendUrl,
  });

  return { message: "Invite resent" };
};
