import type { FastifyRequest, FastifyReply } from "fastify";
import * as workspaceMembersRepo from "../../repositories/workspaceMembers";

export const authorizeAdmin = async (
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  reply: FastifyReply,
) => {
  const { workspaceId } = request.params;
  const userId = request.user.sub;

  const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    request.server.db,
    workspaceId,
    userId,
  );

  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    return reply.status(403).send({ message: "Forbidden" });
  }
};
