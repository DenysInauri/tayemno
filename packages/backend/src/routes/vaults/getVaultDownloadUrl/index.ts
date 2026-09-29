import type { FastifyInstance } from "fastify";
import type { IGetVaultDownloadUrlResponse } from "@tayemno/shared";
import { getVaultDownloadUrl } from "../../../services/vaults";

export const getVaultDownloadUrlRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { vaultId: string };
  }>("/:vaultId/download-url", async (request, reply): Promise<IGetVaultDownloadUrlResponse> => {
    try {
      return await getVaultDownloadUrl(
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
