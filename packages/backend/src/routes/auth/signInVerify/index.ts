import type { FastifyInstance } from "fastify";
import type { ISignInVerifyRequest, ISignInVerifyResponse } from "@tayemno/shared";
import { signInVerify } from "../../../services/auth";

export const signInVerifyRoute = async (app: FastifyInstance) => {
  app.post<{ Body: ISignInVerifyRequest }>(
    "/sign-in/verify",
    async (request, reply): Promise<ISignInVerifyResponse> => {
      try {
        const result = await signInVerify(app.db, request.body);

        const token = app.jwt.sign(
          { sub: result.user.id, username: result.user.username },
          { expiresIn: "24h" },
        );

        return {
          serverSessionProof: result.serverSessionProof,
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
