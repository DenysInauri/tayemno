import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { presignVaultRoute } from "./presignVault";
import { createVaultRoute } from "./createVault";
import { getAllVaultsRoute } from "./getAllVaults";
import { getVaultDownloadUrlRoute } from "./getVaultDownloadUrl";
import { deleteVaultRoute } from "./deleteVault";
import { moveVaultRoute } from "./moveVault";

export const vaultsRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(presignVaultRoute);
  await app.register(createVaultRoute);
  await app.register(getAllVaultsRoute);
  await app.register(getVaultDownloadUrlRoute);
  await app.register(deleteVaultRoute);
  await app.register(moveVaultRoute);
};
