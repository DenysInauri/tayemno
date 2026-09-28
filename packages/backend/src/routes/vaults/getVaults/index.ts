import type { FastifyInstance } from "fastify";
import type { IGetVaultsRequest, IGetVaultsResponse } from "@tayemno/shared";
import { getVaults } from "../../../services/vaults";

export const getVaultsRoute = async (app: FastifyInstance) => {
  app.get<{ Querystring: IGetVaultsRequest }>(
    "/",
    async (request, reply): Promise<IGetVaultsResponse> => {
      try {
        return await getVaults(
          app.db,
          request.user.sub,
          request.query.folderId,
        );
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
