import type { FastifyInstance } from "fastify";
import type { ICreateFolderRequest, ICreateFolderResponse } from "@tayemno/shared";
import { createFolder } from "../../../services/folders";

export const createFolderRoute = async (app: FastifyInstance) => {
  app.post<{ Body: ICreateFolderRequest }>(
    "/",
    async (request, reply): Promise<ICreateFolderResponse> => {
      try {
        return await createFolder(app.db, request.user.sub, request.body);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
