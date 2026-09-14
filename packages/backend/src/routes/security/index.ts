import type { FastifyInstance } from "fastify";
import { checkPasswordBreachRoute } from "./checkPasswordBreach";

export const securityRoutes = async (app: FastifyInstance) => {
  await app.register(checkPasswordBreachRoute);
};
