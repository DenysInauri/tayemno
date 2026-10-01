import type { IFolderTreeNode, IGetFolderTreeResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const getFolderTree = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetFolderTreeResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await foldersRepo.findAllByUser(db, workspaceId, userId);

  const nodeMap = new Map<string, IFolderTreeNode>();
  for (const row of rows) {
    nodeMap.set(row.id, { id: row.id, name: row.name, children: [] });
  }

  const roots: IFolderTreeNode[] = [];
  for (const row of rows) {
    const node = nodeMap.get(row.id)!;
    if (row.parentFolderId && nodeMap.has(row.parentFolderId)) {
      nodeMap.get(row.parentFolderId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return { folders: roots };
};
