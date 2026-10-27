import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { IGetFoldersByParentResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { useDecryptFolderAsMember } from "../useDecryptFolderAsMember";
import { resolvePermissions } from "../resolvePermissions";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import type { ILocalFolder } from "../../../types/local";

const collator = new Intl.Collator(undefined, { numeric: true });

export const PLACEHOLDER_PREFIX = "__placeholder_";

export interface IFolderTreeNode {
  id: string;
  name: string;
  children: IFolderTreeNode[];
}

interface IRootData {
  folders: ILocalFolder[];
  rootCanAdd: boolean;
}

export const useLazyFolderTree = (enabled: boolean) => {
  const { workspace } = useAuth();
  const { decrypt } = useDecryptFolderAsMember();

  const [childrenByParent, setChildrenByParent] = useState<
    Record<string, ILocalFolder[]>
  >({});
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [noAddFolderIds, setNoAddFolderIds] = useState<Set<string>>(new Set());
  const fetchedRef = useRef<Set<string>>(new Set());

  const rootQuery = useQuery<IRootData>({
    queryKey: [QueryKeyEnum.FOLDER_TREE, workspace?.id, "root"],
    queryFn: async () => {
      const { data } = await axios.get<IGetFoldersByParentResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}`,
      );
      const decrypted = await Promise.all(data.folders.map(decrypt));
      return {
        folders: decrypted.sort((a, b) => collator.compare(a.name, b.name)),
        rootCanAdd: resolvePermissions(workspace!.role, data.permissions).canAdd,
      };
    },
    enabled: enabled && !!workspace,
  });

  const expandNode = useCallback(
    async (folderId: string) => {
      if (fetchedRef.current.has(folderId)) return;
      fetchedRef.current.add(folderId);

      setLoadingNodes((prev) => new Set(prev).add(folderId));
      try {
        const { data } = await axios.get<IGetFoldersByParentResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}?parentFolderId=${folderId}`,
        );
        const decrypted = await Promise.all(data.folders.map(decrypt));
        const sorted = decrypted.sort((a, b) =>
          collator.compare(a.name, b.name),
        );
        setChildrenByParent((prev) => ({ ...prev, [folderId]: sorted }));
        if (!resolvePermissions(workspace!.role, data.permissions).canAdd) {
          setNoAddFolderIds((prev) => {
            const next = new Set(prev);
            next.add(folderId);
            return next;
          });
        }
      } catch {
        fetchedRef.current.delete(folderId);
      } finally {
        setLoadingNodes((prev) => {
          const next = new Set(prev);
          next.delete(folderId);
          return next;
        });
      }
    },
    [workspace, decrypt],
  );

  const treeData = useMemo((): IFolderTreeNode[] => {
    if (!rootQuery.data?.folders) return [];

    const buildNode = (folder: ILocalFolder): IFolderTreeNode => {
      const loadedChildren = childrenByParent[folder.id];

      if (loadedChildren !== undefined) {
        return {
          id: folder.id,
          name: folder.name,
          children: loadedChildren.map(buildNode),
        };
      }

      return {
        id: folder.id,
        name: folder.name,
        children: [
          {
            id: `${PLACEHOLDER_PREFIX}${folder.id}`,
            name: "",
            children: [],
          },
        ],
      };
    };

    return rootQuery.data.folders.map(buildNode);
  }, [rootQuery.data, childrenByParent]);

  const folderMap = useMemo(() => {
    const map: Record<string, ILocalFolder> = {};
    const addFolders = (folders: ILocalFolder[]) => {
      for (const folder of folders) {
        map[folder.id] = folder;
      }
    };
    if (rootQuery.data) addFolders(rootQuery.data.folders);
    for (const children of Object.values(childrenByParent)) {
      addFolders(children);
    }
    return map;
  }, [rootQuery.data, childrenByParent]);

  return {
    treeData,
    folderMap,
    isLoading: rootQuery.isLoading,
    expandNode,
    loadingNodes,
    rootCanAdd: rootQuery.data?.rootCanAdd ?? true,
    noAddFolderIds,
  };
};
