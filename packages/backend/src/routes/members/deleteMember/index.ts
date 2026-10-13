import type { FastifyInstance } from "fastify";
import type {
  IDeleteMembersRequest,
  IDeleteMembersResponse,
} from "@tayemno/shared";
import { deleteMembers } from "../../../services/members";

export const deleteMemberRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { workspaceId: string };
    Body: IDeleteMembersRequest;
  }>("/delete", async (request, reply): Promise<IDeleteMembersResponse> => {
    try {
      return await deleteMembers({
        db: app.db,
        requestingUserId: request.user.sub,
        workspaceId: request.params.workspaceId,
        memberIds: request.body.memberIds,
      });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
