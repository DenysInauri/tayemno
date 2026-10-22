import type { FastifyInstance } from "fastify";
import type { IGetAuditLogsResponse } from "@tayemno/shared";
import { authorizeAdmin } from "../../../utils/authorizeAdmin";
import { getAuditLogs } from "../../../services/auditLogs";

export const getAuditLogsRoute = async (app: FastifyInstance) => {
  app.addHook("onRequest", authorizeAdmin);

  app.get<{
    Params: { workspaceId: string };
    Querystring: {
      folderId?: string;
      vaultId?: string;
      cursor?: string;
      limit?: string;
      dateFrom?: string;
      dateTo?: string;
      actionType?: string;
      userId?: string;
    };
  }>("/", async (request, reply): Promise<IGetAuditLogsResponse> => {
    try {
      return await getAuditLogs(
        app.db,
        request.params.workspaceId,
        request.query.folderId,
        request.query.vaultId,
        request.query.cursor,
        request.query.limit ? parseInt(request.query.limit, 10) : undefined,
        request.query.dateFrom,
        request.query.dateTo,
        request.query.actionType,
        request.query.userId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
