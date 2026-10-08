import type { FastifyInstance } from "fastify";
import type { IGetBreadcrumbsResponse } from "@tayemno/shared";
import { getBreadcrumbs } from "../../../services/folders";

export const getBreadcrumbsRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string; folderId: string };
  }>(
    "/:folderId/breadcrumbs",
    async (request, reply): Promise<IGetBreadcrumbsResponse> => {
      try {
        return await getBreadcrumbs(
          app.db,
          request.user.sub,
          request.params.folderId,
        );
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
