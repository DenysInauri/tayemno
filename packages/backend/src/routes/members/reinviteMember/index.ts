import type { FastifyInstance } from "fastify";
import type { IReinviteMemberRequest, IReinviteMemberResponse } from "@tayemno/shared";
import { reinviteMember } from "../../../services/members";

export const reinviteMemberRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { workspaceId: string; memberId: string };
    Body: IReinviteMemberRequest;
  }>("/:memberId/reinvite", async (request, reply): Promise<IReinviteMemberResponse> => {
    try {
      const result = await reinviteMember({
        db: app.db,
        requestingUserId: request.user.sub,
        workspaceId: request.params.workspaceId,
        memberId: request.params.memberId,
        data: request.body,
        mailTransport: app.mailTransport,
        smtpFrom: app.config.SMTP_FROM,
        frontendUrl: app.config.FRONTEND_URL,
      });

      return result;
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
