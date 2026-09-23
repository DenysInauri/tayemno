import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { presignVaultRoute } from "./presignVault";
import { createVaultRoute } from "./createVault";

export const vaultsRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(presignVaultRoute);
  await app.register(createVaultRoute);
};
