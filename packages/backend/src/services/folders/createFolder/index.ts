import type { Database } from "../../../db";
import type {
  ICreateFolderRequest,
  ICreateFolderResponse,
  Folder,
} from "@tayemno/shared";
import { create as insertFolder } from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

const mapFolder = (row: { createdAt: Date; updatedAt: Date }): Folder =>
  ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }) as Folder;

export const createFolder = async (
  db: Database,
  userId: string,
  workspaceId: string,
  data: ICreateFolderRequest,
): Promise<ICreateFolderResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const folder = await insertFolder(db, {
    workspaceId,
    name: data.name,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
  });

  return { folder: mapFolder(folder) };
};
