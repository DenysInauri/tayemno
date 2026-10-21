import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { requirePasswordChanged } from "../../utils/requirePasswordChanged";
import { createAuditLogRoute } from "./createAuditLog";
import { getAuditLogsRoute } from "./getAuditLogs";

export const auditLogsRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);
  app.addHook("onRequest", requirePasswordChanged);

  await app.register(createAuditLogRoute);
  await app.register(getAuditLogsRoute);
};
