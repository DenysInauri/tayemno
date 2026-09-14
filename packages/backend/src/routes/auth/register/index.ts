import type { FastifyInstance } from "fastify";
import type { IRegisterRequest, IRegisterResponse } from "@tayemno/shared";
import { register } from "../../../services/auth";

export const registerRoute = async (app: FastifyInstance) => {
  app.post<{ Body: IRegisterRequest }>(
    "/register",
    async (request, reply): Promise<IRegisterResponse> => {
      try {
        return await register(
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
