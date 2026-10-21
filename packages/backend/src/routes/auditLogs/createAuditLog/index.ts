import type { FastifyInstance } from "fastify";
import type {
  ICreateAuditLogRequest,
  ICreateAuditLogResponse,
} from "@tayemno/shared";
import { createAuditLog } from "../../../services/auditLogs";

export const createAuditLogRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { workspaceId: string };
    Body: ICreateAuditLogRequest;
  }>("/", async (request, reply): Promise<ICreateAuditLogResponse> => {
    try {
      return await createAuditLog(
        app.db,
        request.user.sub,
        request.params.workspaceId,
        request.ip,
        request.body,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
