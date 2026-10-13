import type { FastifyInstance } from "fastify";
import type { IListMembersResponse } from "@tayemno/shared";
import { listMembers } from "../../../services/members";

export const listMembersRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string };
  }>("/", async (request, reply): Promise<IListMembersResponse> => {
    try {
      const members = await listMembers({
        db: app.db,
        requestingUserId: request.user.sub,
        workspaceId: request.params.workspaceId,
      });

      return { members };
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
