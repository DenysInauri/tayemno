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
        const result = await verifyEmail(app.db, request.body);

        const token = app.jwt.sign(
          { sub: result.user.id, username: result.user.username },
          { expiresIn: "24h" },
        );

        return {
          message: result.message,
          token,
          user: result.user,
        };
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
