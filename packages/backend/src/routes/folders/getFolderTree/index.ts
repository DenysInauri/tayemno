import type { FastifyInstance } from "fastify";
import type { IGetFolderTreeResponse } from "@tayemno/shared";
import { getFolderTree } from "../../../services/folders";

export const getFolderTreeRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string };
  }>("/tree", async (request, reply): Promise<IGetFolderTreeResponse> => {
    try {
      return await getFolderTree(
        app.db,
        request.user.sub,
        request.params.workspaceId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
