import type { IMemberItem, WorkspaceRole, WorkspaceMemberStatus } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";

interface IParams {
  db: Database;
  workspaceId: string;
}

export const listMembers = async ({
  db,
  workspaceId,
}: IParams): Promise<IMemberItem[]> => {
  const rows = await workspaceMembersRepo.findAllByWorkspaceId(db, workspaceId);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    publicKey: row.publicKey,
    role: row.role as WorkspaceRole,
    status: (row.status ?? "active") as WorkspaceMemberStatus,
    adminEncryptedUserPrivateKey: row.adminEncryptedUserPrivateKey,
    createdAt: row.createdAt.toISOString(),
  }));
};
