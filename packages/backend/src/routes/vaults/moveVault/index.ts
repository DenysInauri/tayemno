import type { FastifyInstance } from "fastify";
import type { IMoveVaultRequest, IMoveVaultResponse } from "@tayemno/shared";
import { moveVault } from "../../../services/vaults";

export const moveVaultRoute = async (app: FastifyInstance) => {
  app.patch<{
    Params: { vaultId: string };
    Body: IMoveVaultRequest;
  }>("/:vaultId/move", async (request, reply): Promise<IMoveVaultResponse> => {
    try {
      return await moveVault(
        app.db,
        request.user.sub,
        request.params.vaultId,
        request.body,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
