import type { FastifyInstance } from "fastify";
import type { IGetVaultsByFolderResponse } from "@tayemno/shared";
import { getVaultsByFolder } from "../../../services/vaults";

export const getVaultsByFolderRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string };
    Querystring: { folderId?: string };
  }>(
    "/",
    async (request, reply): Promise<IGetVaultsByFolderResponse> => {
      try {
        const folderId = request.query.folderId ?? null;

        return await getVaultsByFolder(
          app.db,
          request.user.sub,
          request.params.workspaceId,
          folderId,
        );
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
