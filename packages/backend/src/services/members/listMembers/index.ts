import type { IMemberItem, WorkspaceRole, WorkspaceMemberStatus } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  requestingUserId: string;
  workspaceId: string;
}

export const listMembers = async ({
  db,
  requestingUserId,
  workspaceId,
}: IParams): Promise<IMemberItem[]> => {
  const requester = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    requestingUserId,
  );

  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    throw new HttpError(403, "Only owners and admins can view members");
  }

  const rows = await workspaceMembersRepo.findAllByWorkspaceId(db, workspaceId);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role as WorkspaceRole,
    status: (row.status ?? "active") as WorkspaceMemberStatus,
    adminEncryptedUserPrivateKey: row.adminEncryptedUserPrivateKey,
    createdAt: row.createdAt.toISOString(),
  }));
};
