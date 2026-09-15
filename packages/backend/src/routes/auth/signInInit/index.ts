import type { FastifyInstance } from "fastify";
import type { ISignInInitRequest, ISignInInitResponse } from "@tayemno/shared";
import { signInInit } from "../../../services/auth";

export const signInInitRoute = async (app: FastifyInstance) => {
  app.post<{ Body: ISignInInitRequest }>(
    "/sign-in/init",
    async (request, reply): Promise<ISignInInitResponse> => {
      try {
        return await signInInit(app.db, request.body);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
