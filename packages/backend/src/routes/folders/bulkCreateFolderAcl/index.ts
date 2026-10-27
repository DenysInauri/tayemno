import type { FastifyInstance } from "fastify";
import type {
  IBulkCreateFolderAclRequest,
  IBulkCreateFolderAclResponse,
} from "@tayemno/shared";
import { bulkCreateFolderAcl } from "../../../services/folders";

export const bulkCreateFolderAclRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { workspaceId: string; folderId: string };
    Body: IBulkCreateFolderAclRequest;
  }>(
    "/:folderId/acl/bulk",
    async (request, reply): Promise<IBulkCreateFolderAclResponse> => {
      try {
        return await bulkCreateFolderAcl(
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
    },
  );
};
