import type { FastifyInstance } from "fastify";
import type {
  IVerifyEmailRequest,
  IVerifyEmailResponse,
} from "@tayemno/shared";
import { verifyEmail } from "../../../services/auth";

export const verifyEmailRoute = async (app: FastifyInstance) => {
  app.post<{ Body: IVerifyEmailRequest }>(
    "/verify-email",
    async (request, reply): Promise<IVerifyEmailResponse> => {
      try {
        return await verifyEmail(app.db, request.body);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
