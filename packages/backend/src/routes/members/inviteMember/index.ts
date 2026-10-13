import type { FastifyInstance } from "fastify";
import type { IInviteMemberRequest, IInviteMemberResponse } from "@tayemno/shared";
import { inviteMember } from "../../../services/members";

export const inviteMemberRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { workspaceId: string };
    Body: IInviteMemberRequest;
  }>("/", async (request, reply): Promise<IInviteMemberResponse> => {
    try {
      const member = await inviteMember({
        db: app.db,
        workspaceId: request.params.workspaceId,
        data: request.body,
        mailTransport: app.mailTransport,
        smtpFrom: app.config.SMTP_FROM,
        frontendUrl: app.config.FRONTEND_URL,
      });

      return reply.status(201).send({ member });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
