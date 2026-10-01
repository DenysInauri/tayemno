import type { FastifyInstance } from "fastify";
import type { IDeleteFolderResponse } from "@tayemno/shared";
import { deleteFolder } from "../../../services/folders";

export const deleteFolderRoute = async (app: FastifyInstance) => {
  app.delete<{
    Params: { workspaceId: string; folderId: string };
  }>("/:folderId", async (request, reply): Promise<IDeleteFolderResponse> => {
    try {
      return await deleteFolder(
        app.s3,
        app.config.S3_BUCKET,
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
