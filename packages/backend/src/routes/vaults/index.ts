import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { presignVaultRoute } from "./presignVault";
import { createVaultRoute } from "./createVault";
import { getVaultsRoute } from "./getVaults";
import { getVaultDownloadUrlRoute } from "./getVaultDownloadUrl";
import { deleteVaultRoute } from "./deleteVault";

export const vaultsRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(presignVaultRoute);
  await app.register(createVaultRoute);
  await app.register(getVaultsRoute);
  await app.register(getVaultDownloadUrlRoute);
  await app.register(deleteVaultRoute);
};
