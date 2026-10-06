import { useQuery } from "@tanstack/react-query";
import keyBy from "lodash/keyBy";
import type {
  IGetAllVaultsResponse,
  IGetAllFoldersResponse,
} from "@tayemno/shared";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";
import { axios } from "../../axios";
import { useDecryptFolder } from "../useDecryptFolder";
import { useDecryptVault } from "../useDecryptVault";
import type { ILocalFolder, ILocalVault } from "../../../types/local";

const collator = new Intl.Collator(undefined, { numeric: true });

export interface IFolderTreeNode {
  id: string;
  name: string;
  children: IFolderTreeNode[];
}

export interface IFolderSize {
  sizeBytes: number;
  encryptedSizeBytes: number;
}

export interface IDecryptedState {
  foldersById: Record<string, ILocalFolder>;
  foldersByParentId: Record<string, ILocalFolder[]>;
  folderTree: IFolderTreeNode[];
  folderSizesById: Record<string, IFolderSize>;
  vaultsById: Record<string, ILocalVault>;
  vaultsByFolderId: Record<string, ILocalVault[]>;
}

export const useClaudeStateQuery = () => {
  const { workspace } = useAuth();
  const { decrypt: decryptFolder } = useDecryptFolder();
  const { decrypt: decryptVault } = useDecryptVault();

  const buildFolderTree = (
    foldersByParentId: Record<string, ILocalFolder[]>,
    parentId: string,
  ): IFolderTreeNode[] => {
    const children = foldersByParentId[parentId] ?? [];
    return children
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        children: buildFolderTree(foldersByParentId, folder.id),
      }))
      .sort((a, b) => collator.compare(a.name, b.name));
  };

  const buildFoldersStructures = (folders: ILocalFolder[]) => {
    const foldersById = keyBy(folders, "id");

    const foldersByParentId: Record<string, ILocalFolder[]> = {};
    for (const folder of folders) {
      const key = folder.parentFolderId ?? "root";
      if (!foldersByParentId[key]) foldersByParentId[key] = [];
      foldersByParentId[key].push(folder);
    }
    for (const list of Object.values(foldersByParentId)) {
      list.sort((a, b) => collator.compare(a.name, b.name));
    }

    return { foldersById, foldersByParentId };
  };

  const buildVaultsStructures = (vaults: ILocalVault[]) => {
    const vaultsById: Record<string, ILocalVault> = {};
    const vaultsByFolderId: Record<string, ILocalVault[]> = {};
    for (const vault of vaults) {
      vaultsById[vault.id] = vault;
      const key = vault.folderId ?? "root";
      if (!vaultsByFolderId[key]) vaultsByFolderId[key] = [];
      vaultsByFolderId[key].push(vault);
    }
    for (const list of Object.values(vaultsByFolderId)) {
      list.sort((a, b) => collator.compare(a.name, b.name));
    }

    return { vaultsById, vaultsByFolderId };
  };

  const query = useQuery<IDecryptedState>({
    queryKey: [QueryKeyEnum.CLAUDE_STATE],
    queryFn: async () => {
      const [vaultsRes, foldersRes] = await Promise.all([
        axios.get<IGetAllVaultsResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}/vaults/all`,
        ),
        axios.get<IGetAllFoldersResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders/all`,
        ),
      ]);

      const decryptedFolders = await Promise.all(
        foldersRes.data.folders.map(decryptFolder),
      );

      const { foldersByParentId, foldersById } =
        buildFoldersStructures(decryptedFolders);

      const decryptedVaults = await Promise.all(
        vaultsRes.data.vaults.map((vault) =>
          decryptVault(
            vault,
            vault.folderId ? foldersById[vault.folderId] : null,
          ),
        ),
      );

      const { vaultsByFolderId, vaultsById } =
        buildVaultsStructures(decryptedVaults);

      const folderTree = buildFolderTree(foldersByParentId, "root");

      const computeFolderSize = (folderId: string): IFolderSize => {
        const directVaults = vaultsByFolderId[folderId] ?? [];
        let sizeBytes = directVaults.reduce((sum, v) => sum + v.sizeBytes, 0);
        let encryptedSizeBytes = directVaults.reduce(
          (sum, v) => sum + v.encryptedSizeBytes,
          0,
        );

        const childFolders = foldersByParentId[folderId] ?? [];
        for (const child of childFolders) {
          const childSize = computeFolderSize(child.id);
          sizeBytes += childSize.sizeBytes;
          encryptedSizeBytes += childSize.encryptedSizeBytes;
        }

        return { sizeBytes, encryptedSizeBytes };
      };

      const folderSizesById: Record<string, IFolderSize> = {};
      for (const folderId of Object.keys(foldersById)) {
        folderSizesById[folderId] = computeFolderSize(folderId);
      }

      return {
        foldersById,
        foldersByParentId,
        folderTree,
        folderSizesById,
        vaultsById,
        vaultsByFolderId,
      };
    },
    enabled: !!workspace,
  });

  return { ...query, data: query.data ?? defaultState };
};

const defaultState: IDecryptedState = {
  foldersById: {},
  foldersByParentId: {},
  folderTree: [],
  folderSizesById: {},
  vaultsById: {},
  vaultsByFolderId: {},
};
