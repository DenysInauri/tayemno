import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { requirePasswordChanged } from "../../utils/requirePasswordChanged";
import { presignVaultRoute } from "./presignVault";
import { createVaultRoute } from "./createVault";
import { getAllVaultsRoute } from "./getAllVaults";
import { getVaultsByFolderRoute } from "./getVaultsByFolder";
import { getVaultRoute } from "./getVault";
import { getVaultDownloadUrlRoute } from "./getVaultDownloadUrl";
import { getVaultThumbnailUrlRoute } from "./getVaultThumbnailUrl";
import { deleteVaultRoute } from "./deleteVault";
import { moveVaultRoute } from "./moveVault";

export const vaultsRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);
  app.addHook("onRequest", requirePasswordChanged);

  await app.register(presignVaultRoute);
  await app.register(createVaultRoute);
  await app.register(getAllVaultsRoute);
  await app.register(getVaultsByFolderRoute);
  await app.register(getVaultRoute);
  await app.register(getVaultDownloadUrlRoute);
  await app.register(getVaultThumbnailUrlRoute);
  await app.register(deleteVaultRoute);
  await app.register(moveVaultRoute);
};
