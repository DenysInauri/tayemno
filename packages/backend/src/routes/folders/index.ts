import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { createFolderRoute } from "./createFolder";
import { deleteFolderRoute } from "./deleteFolder";
import { getAllFoldersRoute } from "./getAllFolders";
import { getFoldersByParentRoute } from "./getFoldersByParent";
import { getFolderRoute } from "./getFolder";
import { getBreadcrumbsRoute } from "./getBreadcrumbs";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(getBreadcrumbsRoute);
  await app.register(getAllFoldersRoute);
  await app.register(getFolderRoute);
  await app.register(getFoldersByParentRoute);
  await app.register(createFolderRoute);
  await app.register(deleteFolderRoute);
};
