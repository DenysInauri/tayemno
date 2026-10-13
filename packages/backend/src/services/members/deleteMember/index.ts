import type { Database } from "../../../db";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as usersRepo from "../../../repositories/users";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  requestingUserId: string;
  workspaceId: string;
  memberIds: string[];
}

export const deleteMembers = async ({
  db,
  requestingUserId,
  workspaceId,
  memberIds,
}: IParams) => {
  const members = await workspaceMembersRepo.findByIdsAndWorkspaceId(
    db,
    memberIds,
    workspaceId,
  );

  if (members.length !== memberIds.length) {
    throw new HttpError(404, "One or more members not found in this workspace");
  }

  for (const member of members) {
    if (member.role === "owner") {
      throw new HttpError(403, "Cannot delete the workspace owner");
    }

    if (member.userId === requestingUserId) {
      throw new HttpError(403, "Cannot delete yourself");
    }
  }

  const userIds = members.map((m) => m.userId);
  await usersRepo.deleteByIds(db, userIds);

  return { message: "Members deleted" };
};
