import type { FastifyInstance } from "fastify";
import type { ICreateVaultRequest, ICreateVaultResponse } from "@tayemno/shared";
import { createVault } from "../../../services/vaults";

export const createVaultRoute = async (app: FastifyInstance) => {
  app.post<{ Body: ICreateVaultRequest }>(
    "/",
    async (request, reply): Promise<ICreateVaultResponse> => {
      try {
        return await createVault(app.db, request.user.sub, request.body);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
