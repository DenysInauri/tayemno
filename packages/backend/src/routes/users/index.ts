import type { FastifyInstance } from "fastify";
import { checkUsernameRoute } from "./checkUsername";
import { checkEmailRoute } from "./checkEmail";

export const usersRoutes = async (app: FastifyInstance) => {
  await app.register(checkUsernameRoute);
  await app.register(checkEmailRoute);
};
