import type { FastifyInstance } from "fastify";
import type { IGetFoldersResponse } from "@tayemno/shared";
import { getFolders } from "../../../services/folders";

export const getFoldersRoute = async (app: FastifyInstance) => {
  app.get(
    "/",
    async (request, reply): Promise<IGetFoldersResponse> => {
      try {
        return await getFolders(app.db, request.user.sub);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
