import type { FastifyInstance } from "fastify";
import type { IGetFoldersByParentResponse } from "@tayemno/shared";
import { getFoldersByParent } from "../../../services/folders";

export const getFoldersByParentRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string };
    Querystring: { parentFolderId?: string };
  }>("/", async (request, reply): Promise<IGetFoldersByParentResponse> => {
    try {
      const parentFolderId = request.query.parentFolderId ?? null;

      return await getFoldersByParent(
        app.db,
        request.user.sub,
        request.params.workspaceId,
        parentFolderId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
