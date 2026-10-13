import type { FastifyRequest, FastifyReply } from "fastify";
import * as usersRepo from "../../repositories/users";

export const requirePasswordChanged = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const userId = request.user.sub;

  const user = await usersRepo.findById(request.server.db, userId);

  if (user?.forcePasswordChange) {
    return reply
      .status(403)
      .send({ message: "Password change required" });
  }
};
