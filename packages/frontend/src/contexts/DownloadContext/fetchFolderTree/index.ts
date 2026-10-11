import type {
  Folder,
  Vault,
  IGetFoldersByParentResponse,
  IGetVaultsByFolderResponse,
} from "@tayemno/shared";
import type { ILocalFolder, ILocalVault } from "../../../types/local";
import { axios } from "../../../api";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export interface ITreeNode {
  folder: ILocalFolder;
  vaults: ILocalVault[];
  children: ITreeNode[];
}

interface IParams {
  rootFolder: ILocalFolder;
  workspaceId: string;
  signal: AbortSignal;
  decryptFolder: (folder: Folder) => Promise<ILocalFolder>;
  decryptVault: (vault: Vault) => Promise<ILocalVault>;
}

const fetchFolderContents = async (
  folderId: string,
  workspaceId: string,
  signal: AbortSignal,
  decryptFolder: IParams["decryptFolder"],
  decryptVault: IParams["decryptVault"],
) => {
  if (signal.aborted) {
    throw new DOMException("Download aborted", "AbortError");
  }

  const [foldersRes, vaultsRes] = await Promise.all([
    axios.get<IGetFoldersByParentResponse>(
      `${EndpointEnum.WORKSPACES}/${workspaceId}${EndpointEnum.FOLDERS}?parentFolderId=${folderId}`,
    ),
    axios.get<IGetVaultsByFolderResponse>(
      `${EndpointEnum.WORKSPACES}/${workspaceId}${EndpointEnum.VAULTS}?folderId=${folderId}`,
    ),
  ]);

  const folders = await Promise.all(foldersRes.data.folders.map(decryptFolder));
  const vaults = await Promise.all(vaultsRes.data.vaults.map(decryptVault));

  return { folders, vaults };
};

export const fetchFolderTree = async ({
  rootFolder,
  workspaceId,
  signal,
  decryptFolder,
  decryptVault,
}: IParams): Promise<ITreeNode> => {
  const buildNode = async (folder: ILocalFolder): Promise<ITreeNode> => {
    const contents = await fetchFolderContents(
      folder.id,
      workspaceId,
      signal,
      decryptFolder,
      decryptVault,
    );

    const children = await Promise.all(contents.folders.map(buildNode));

    return { folder, vaults: contents.vaults, children };
  };

  return buildNode(rootFolder);
};

export const countFiles = (node: ITreeNode): number =>
  node.vaults.length +
  node.children.reduce((sum, child) => sum + countFiles(child), 0);
