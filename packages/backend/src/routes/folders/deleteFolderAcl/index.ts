import type { FastifyInstance } from "fastify";
import type { IDeleteFolderAclResponse } from "@tayemno/shared";
import { deleteFolderAcl } from "../../../services/folders";

export const deleteFolderAclRoute = async (app: FastifyInstance) => {
  app.delete<{
    Params: { folderId: string; userId: string };
  }>("/:folderId/acl/:userId", async (request, reply): Promise<IDeleteFolderAclResponse> => {
    try {
      return await deleteFolderAcl(
        app.db,
        request.user.sub,
        request.params.folderId,
        request.params.userId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
