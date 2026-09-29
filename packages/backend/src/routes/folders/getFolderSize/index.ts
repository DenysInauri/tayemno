import type { FastifyInstance } from "fastify";
import type { IGetFolderSizeResponse } from "@tayemno/shared";
import { getFolderSize } from "../../../services/folders";

export const getFolderSizeRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string; folderId: string };
  }>("/:folderId/size", async (request, reply): Promise<IGetFolderSizeResponse> => {
    try {
      return await getFolderSize(
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
