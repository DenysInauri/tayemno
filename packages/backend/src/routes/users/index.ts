import type { FastifyInstance } from "fastify";
import type {
  ICheckUsernameParams,
  ICheckUsernameResponse,
} from "@tayemno/shared";
import { isUsernameFree } from "../../services/users";

export const usersRoutes = async (app: FastifyInstance) => {
  app.get<{ Params: ICheckUsernameParams }>(
    "/check-username/:username",
    async (request): Promise<ICheckUsernameResponse> => {
      const { username } = request.params;
      return isUsernameFree(app.db, username);
    },
  );
};
