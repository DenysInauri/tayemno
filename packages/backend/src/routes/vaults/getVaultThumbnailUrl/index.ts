import type { FastifyInstance } from "fastify";
import type { IGetVaultThumbnailUrlResponse } from "@tayemno/shared";
import { getVaultThumbnailUrl } from "../../../services/vaults";

export const getVaultThumbnailUrlRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { vaultId: string };
  }>("/:vaultId/thumbnail-url", async (request, reply): Promise<IGetVaultThumbnailUrlResponse> => {
    try {
      return await getVaultThumbnailUrl(
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
