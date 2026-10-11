import type { FastifyInstance } from "fastify";
import type { IGetVaultResponse } from "@tayemno/shared";
import { getVault } from "../../../services/vaults";

export const getVaultRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { vaultId: string };
  }>("/:vaultId", async (request, reply): Promise<IGetVaultResponse> => {
    try {
      return await getVault(
        app.db,
        request.user.sub,
        request.params.vaultId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
