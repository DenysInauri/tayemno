import type { FastifyInstance } from "fastify";
import type { IGetFolderResponse } from "@tayemno/shared";
import { getFolder } from "../../../services/folders";

export const getFolderRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string; folderId: string };
  }>("/:folderId", async (request, reply): Promise<IGetFolderResponse> => {
    try {
      return await getFolder(
        app.db,
        request.user.sub,
        request.params.workspaceId,
        request.params.folderId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
