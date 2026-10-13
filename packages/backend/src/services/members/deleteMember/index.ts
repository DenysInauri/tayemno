import type { Database } from "../../../db";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as usersRepo from "../../../repositories/users";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  requestingUserId: string;
  workspaceId: string;
  memberId: string;
}

export const deleteMember = async ({
  db,
  requestingUserId,
  workspaceId,
  memberId,
}: IParams) => {
  const requester = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    requestingUserId,
  );

  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    throw new HttpError(403, "Only owners and admins can delete members");
  }

  const target = await workspaceMembersRepo.findById(db, memberId);

  if (!target || target.workspaceId !== workspaceId) {
    throw new HttpError(404, "Member not found");
  }

  if (target.role === "owner") {
    throw new HttpError(403, "Cannot delete the workspace owner");
  }

  if (target.userId === requestingUserId) {
    throw new HttpError(403, "Cannot delete yourself");
  }

  await usersRepo.deleteById(db, target.userId);

  return { message: "Member deleted" };
};
