import type { Database } from "../../../db";
import type {
  ICreateFolderRequest,
  ICreateFolderResponse,
  Folder,
  FolderKeyShare,
} from "@tayemno/shared";
import { create as insertFolder } from "../../../repositories/folders";
import { create as insertFolderKeyShare } from "../../../repositories/folderKeyShares";

const mapFolder = (row: { createdAt: Date; updatedAt: Date }): Folder =>
  ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }) as Folder;

const mapFolderKeyShare = (row: { createdAt: Date; updatedAt: Date }): FolderKeyShare =>
  ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }) as FolderKeyShare;

export const createFolder = async (
  db: Database,
  userId: string,
  data: ICreateFolderRequest,
): Promise<ICreateFolderResponse> => {
  const folder = await insertFolder(db, {
    ownerId: userId,
    name: data.name,
  });

  const folderKeyShare = await insertFolderKeyShare(db, {
    folderId: folder.id,
    userId,
    symmetricKey: data.symmetricKey,
  });

  return {
    folder: mapFolder(folder),
    folderKeyShare: mapFolderKeyShare(folderKeyShare),
  };
};
