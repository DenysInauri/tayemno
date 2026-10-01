import type { FastifyInstance } from "fastify";
import type { IDeleteVaultResponse } from "@tayemno/shared";
import { deleteVault } from "../../../services/vaults";

export const deleteVaultRoute = async (app: FastifyInstance) => {
  app.delete<{
    Params: { vaultId: string };
  }>("/:vaultId", async (request, reply): Promise<IDeleteVaultResponse> => {
    try {
      return await deleteVault(
        app.s3,
        app.config.S3_BUCKET,
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
