import type { FastifyInstance } from "fastify";
import type { IPresignVaultRequest, IPresignVaultResponse } from "@tayemno/shared";
import { presignVault } from "../../../services/vaults";

export const presignVaultRoute = async (app: FastifyInstance) => {
  app.post<{ Body: IPresignVaultRequest }>(
    "/presign",
    async (request, reply): Promise<IPresignVaultResponse> => {
      try {
        return await presignVault(
          app.s3,
          app.config.S3_BUCKET,
          app.db,
          request.user.sub,
          request.body,
        );
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
