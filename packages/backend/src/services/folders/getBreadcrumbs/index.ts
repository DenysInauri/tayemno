import type { IGetBreadcrumbsResponse, Folder } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import { HttpError } from "../../../utils/httpError";

export const getBreadcrumbs = async (
  db: Database,
  userId: string,
  folderId: string,
): Promise<IGetBreadcrumbsResponse> => {
  const rows = await foldersRepo.findBreadcrumbs(db, folderId, userId);

  if (rows.length === 0) {
    throw new HttpError(404, "Folder not found");
  }

  return {
    breadcrumbs: (rows as any[]).map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    })) as Folder[],
  };
};
