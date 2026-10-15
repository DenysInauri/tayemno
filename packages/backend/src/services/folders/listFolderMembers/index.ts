import type { IListFolderMembersResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";

export const listFolderMembers = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
): Promise<IListFolderMembersResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await folderAclsRepo.findAllByFolderIdWithAncestors(db, folderId);

  return {
    members: rows.map((row) => {
      const inherited = row.folderId !== folderId;
      return {
        userId: row.userId,
        name: row.name,
        email: row.email,
        inherited,
        ...(inherited && {
          ancestorFolderId: row.folderId,
          ancestorEncryptedName: row.encryptedName,
          ancestorNameNonce: row.nameNonce,
        }),
        createdAt: new Date(row.createdAt).toISOString(),
      };
    }),
  };
};
