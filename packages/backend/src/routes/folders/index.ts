import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { createFolderRoute } from "./createFolder";
import { deleteFolderRoute } from "./deleteFolder";
import { getFolderRoute } from "./getFolder";
import { getFolderSizeRoute } from "./getFolderSize";
import { getFoldersRoute } from "./getFolders";
import { getFolderTreeRoute } from "./getFolderTree";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(createFolderRoute);
  await app.register(deleteFolderRoute);
  await app.register(getFolderRoute);
  await app.register(getFolderSizeRoute);
  await app.register(getFoldersRoute);
  await app.register(getFolderTreeRoute);
};
