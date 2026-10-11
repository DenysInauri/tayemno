import type { FastifyInstance } from "fastify";
import type { IMoveFolderRequest, IMoveFolderResponse } from "@tayemno/shared";
import { moveFolder } from "../../../services/folders";

export const moveFolderRoute = async (app: FastifyInstance) => {
  app.patch<{
    Params: { folderId: string };
    Body: IMoveFolderRequest;
  }>("/:folderId/move", async (request, reply): Promise<IMoveFolderResponse> => {
    try {
      return await moveFolder(
        app.db,
        request.user.sub,
        request.params.folderId,
        request.body,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
