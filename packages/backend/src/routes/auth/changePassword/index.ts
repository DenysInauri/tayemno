import type { FastifyInstance } from "fastify";
import type { IChangePasswordRequest, IChangePasswordResponse } from "@tayemno/shared";
import { changePassword } from "../../../services/auth";
import { authenticate } from "../../../utils/authenticate";

export const changePasswordRoute = async (app: FastifyInstance) => {
  app.post<{ Body: IChangePasswordRequest }>(
    "/change-password",
    { preHandler: authenticate },
    async (request, reply): Promise<IChangePasswordResponse> => {
      try {
        const result = await changePassword({
          db: app.db,
          userId: request.user.sub,
          data: request.body,
        });

        return result;
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
