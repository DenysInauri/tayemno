import type { FastifyInstance } from "fastify";
import type { IGetAllFoldersResponse } from "@tayemno/shared";
import { getAllFolders } from "../../../services/folders";

export const getAllFoldersRoute = async (app: FastifyInstance) => {
  app.get<{ Params: { workspaceId: string } }>(
    "/all",
    async (request, reply): Promise<IGetAllFoldersResponse> => {
      const start = Date.now();
      try {
        return await getAllFolders(
          app.db,
          request.user.sub,
          request.params.workspaceId,
        );
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      } finally {
        console.log(`getAllFolders took ${Date.now() - start}ms`);
      }
    },
  );
};
