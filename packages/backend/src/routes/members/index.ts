import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { inviteMemberRoute } from "./inviteMember";
import { listMembersRoute } from "./listMembers";
import { deleteMemberRoute } from "./deleteMember";
import { reinviteMemberRoute } from "./reinviteMember";

export const membersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(inviteMemberRoute);
  await app.register(listMembersRoute);
  await app.register(deleteMemberRoute);
  await app.register(reinviteMemberRoute);
};
