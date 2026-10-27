import type { FastifyInstance } from "fastify";
import type { IUpdateFolderAclRoleRequest, IUpdateFolderAclRoleResponse } from "@tayemno/shared";
import { updateFolderAclRole } from "../../../services/folders";

export const updateFolderAclRoleRoute = async (app: FastifyInstance) => {
  app.patch<{
    Params: { folderId: string; userId: string };
    Body: IUpdateFolderAclRoleRequest;
  }>("/:folderId/acl/:userId/role", async (request, reply): Promise<IUpdateFolderAclRoleResponse> => {
    try {
      return await updateFolderAclRole(
        app.db,
        request.user.sub,
        request.params.folderId,
        request.params.userId,
        request.body,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
