import type { FastifyInstance } from "fastify";
import type { IDeleteMemberResponse } from "@tayemno/shared";
import { deleteMember } from "../../../services/members";

export const deleteMemberRoute = async (app: FastifyInstance) => {
  app.delete<{
    Params: { workspaceId: string; memberId: string };
  }>("/:memberId", async (request, reply): Promise<IDeleteMemberResponse> => {
    try {
      const result = await deleteMember({
        db: app.db,
        requestingUserId: request.user.sub,
        workspaceId: request.params.workspaceId,
        memberId: request.params.memberId,
      });

      return result;
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
