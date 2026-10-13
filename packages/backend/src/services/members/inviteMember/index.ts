import type { IInviteMemberRequest, IMemberItem, InvitableRole } from "@tayemno/shared";
import type { Transporter } from "nodemailer";
import type { Database } from "../../../db";
import * as usersRepo from "../../../repositories/users";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { sendInviteEmail } from "../../email";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  workspaceId: string;
  data: IInviteMemberRequest;
  mailTransport: Transporter;
  smtpFrom: string;
  frontendUrl: string;
}

export const inviteMember = async ({
  db,
  workspaceId,
  data,
  mailTransport,
  smtpFrom,
  frontendUrl,
}: IParams): Promise<IMemberItem> => {
  const existingUser = await usersRepo.findByEmail(db, data.email.toLowerCase());
  if (existingUser) {
    throw new HttpError(409, "User with this email already exists");
  }

  const user = await usersRepo.create(db, {
    email: data.email.toLowerCase(),
    emailVerified: true,
    name: data.name,
    srpSalt: data.srpSalt,
    srpVerifier: data.srpVerifier,
    kdfSalt: data.kdfSalt,
    kdfAlgorithm: data.kdfAlgorithm,
    kdfMemoryKib: data.kdfMemoryKib,
    kdfIterations: data.kdfIterations,
    kdfParallelism: data.kdfParallelism,
    publicKey: data.publicKey,
    encryptedPrivateKey: data.encryptedPrivateKey,
    privateKeyNonce: data.privateKeyNonce,
    forcePasswordChange: true,
  });

  const membership = await workspaceMembersRepo.create(db, {
    workspaceId,
    userId: user.id,
    role: data.role,
    status: "invited",
    encryptedAdminPrivateKey: data.encryptedAdminPrivateKey,
    encryptedMemberPrivateKey: data.encryptedMemberPrivateKey,
    adminEncryptedUserPrivateKey: data.adminEncryptedUserPrivateKey,
  });

  await sendInviteEmail({
    transport: mailTransport,
    from: smtpFrom,
    to: user.email,
    workspaceName: data.workspaceName,
    tempPassword: data.tempPassword,
    frontendUrl,
  });

  return {
    id: membership.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: membership.role as InvitableRole,
    status: "invited",
    adminEncryptedUserPrivateKey: membership.adminEncryptedUserPrivateKey,
    createdAt: membership.createdAt.toISOString(),
  };
};
