import type { FastifyInstance } from "fastify";
import { registerRoute } from "./register";
import { verifyEmailRoute } from "./verifyEmail";
import { resendVerificationRoute } from "./resendVerification";

export const authRoutes = async (app: FastifyInstance) => {
  await app.register(registerRoute);
  await app.register(verifyEmailRoute);
  await app.register(resendVerificationRoute);
};
