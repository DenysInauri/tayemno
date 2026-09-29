import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { createFolderRoute } from "./createFolder";
import { getFolderRoute } from "./getFolder";
import { getFoldersRoute } from "./getFolders";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(createFolderRoute);
  await app.register(getFolderRoute);
  await app.register(getFoldersRoute);
};
