import type { FastifyInstance } from "fastify";
import { registerRoute } from "./register";
import { verifyEmailRoute } from "./verifyEmail";
import { resendVerificationRoute } from "./resendVerification";
import { signInInitRoute } from "./signInInit";
import { signInVerifyRoute } from "./signInVerify";

export const authRoutes = async (app: FastifyInstance) => {
  await app.register(registerRoute);
  await app.register(verifyEmailRoute);
  await app.register(resendVerificationRoute);
  await app.register(signInInitRoute);
  await app.register(signInVerifyRoute);
};
