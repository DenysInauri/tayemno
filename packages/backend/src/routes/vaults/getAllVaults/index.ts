import type { FastifyInstance } from "fastify";
import type { IGetAllVaultsResponse } from "@tayemno/shared";
import { getAllVaults } from "../../../services/vaults";

export const getAllVaultsRoute = async (app: FastifyInstance) => {
  app.get<{ Querystring: { workspaceId: string } }>(
    "/all",
    async (request, reply): Promise<IGetAllVaultsResponse> => {
      try {
        return await getAllVaults(app.db, request.user.sub, request.query.workspaceId);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
