import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { requirePasswordChanged } from "../../utils/requirePasswordChanged";
import { createFolderRoute } from "./createFolder";
import { deleteFolderRoute } from "./deleteFolder";
import { getAllFoldersRoute } from "./getAllFolders";
import { getFoldersByParentRoute } from "./getFoldersByParent";
import { getFolderRoute } from "./getFolder";
import { getBreadcrumbsRoute } from "./getBreadcrumbs";
import { moveFolderRoute } from "./moveFolder";
import { createFolderAclRoute } from "./createFolderAcl";
import { bulkCreateFolderAclRoute } from "./bulkCreateFolderAcl";
import { deleteFolderAclRoute } from "./deleteFolderAcl";
import { listFolderMembersRoute } from "./listFolderMembers";
import { updateFolderAclRoleRoute } from "./updateFolderAclRole";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);
  app.addHook("onRequest", requirePasswordChanged);

  await app.register(getBreadcrumbsRoute);
  await app.register(getAllFoldersRoute);
  await app.register(getFolderRoute);
  await app.register(getFoldersByParentRoute);
  await app.register(createFolderRoute);
  await app.register(deleteFolderRoute);
  await app.register(moveFolderRoute);
  await app.register(createFolderAclRoute);
  await app.register(deleteFolderAclRoute);
  await app.register(listFolderMembersRoute);
  await app.register(bulkCreateFolderAclRoute);
  await app.register(updateFolderAclRoleRoute);
};
