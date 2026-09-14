import type { FastifyInstance } from "fastify";
import type { ICheckEmailParams, ICheckEmailResponse } from "@tayemno/shared";
import { isEmailFree } from "../../../services/users";

export const checkEmailRoute = async (app: FastifyInstance) => {
  app.get<{ Params: ICheckEmailParams }>(
    "/check-email/:email",
    async (request): Promise<ICheckEmailResponse> => {
      const { email } = request.params;
      return isEmailFree(app.db, email.toLowerCase());
    },
  );
};
