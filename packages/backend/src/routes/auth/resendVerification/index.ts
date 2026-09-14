import type { FastifyInstance } from "fastify";
import type {
  IResendVerificationRequest,
  IResendVerificationResponse,
} from "@tayemno/shared";
import { resendVerification } from "../../../services/auth";

export const resendVerificationRoute = async (app: FastifyInstance) => {
  app.post<{ Body: IResendVerificationRequest }>(
    "/resend-verification",
    async (request, reply): Promise<IResendVerificationResponse> => {
      try {
        return await resendVerification(
          app.db,
          app.mailTransport,
          app.config.SMTP_FROM,
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
