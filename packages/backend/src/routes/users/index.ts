import type { FastifyInstance } from "fastify";
import { checkEmailRoute } from "./checkEmail";

export const usersRoutes = async (app: FastifyInstance) => {
  await app.register(checkEmailRoute);
};
