import type { FastifyInstance } from "fastify";
import type { ICreateFolderAclRequest, ICreateFolderAclResponse } from "@tayemno/shared";
import { createFolderAcl } from "../../../services/folders";

export const createFolderAclRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { folderId: string };
    Body: ICreateFolderAclRequest;
  }>("/:folderId/acl", async (request, reply): Promise<ICreateFolderAclResponse> => {
    try {
      return await createFolderAcl(
        app.db,
        request.user.sub,
        request.params.folderId,
        request.body,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
