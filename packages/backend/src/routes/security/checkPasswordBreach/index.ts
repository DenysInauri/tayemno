import type { FastifyInstance } from "fastify";
import type {
  ICheckPasswordBreachParams,
  ICheckPasswordBreachResponse,
} from "@tayemno/shared";
import { checkPasswordBreach } from "../../../services/security";

export const checkPasswordBreachRoute = async (app: FastifyInstance) => {
  app.get<{ Params: ICheckPasswordBreachParams }>(
    "/check-password-breach/:hash",
    async (request): Promise<ICheckPasswordBreachResponse> => {
      const { hash } = request.params;
      return checkPasswordBreach(hash.toUpperCase());
    },
  );
};
