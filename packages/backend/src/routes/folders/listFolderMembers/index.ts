import type { FastifyInstance } from "fastify";
import type { IListFolderMembersResponse } from "@tayemno/shared";
import { listFolderMembers } from "../../../services/folders";

export const listFolderMembersRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { folderId: string };
  }>("/:folderId/members", async (request, reply): Promise<IListFolderMembersResponse> => {
    try {
      return await listFolderMembers(
        app.db,
        request.user.sub,
        request.params.folderId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
