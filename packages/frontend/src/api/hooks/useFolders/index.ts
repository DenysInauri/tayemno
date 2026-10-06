import { useMemo } from "react";
import { useClaudeState } from "../../../contexts/ClaudeStateContext";
import type { ILocalFolder } from "../../../types/local";

export interface IBreadcrumb {
  id: string;
  name: string;
}

export const useFolders = (parentFolderId: string | null) => {
  const { data, isLoading } = useClaudeState();

  const key = parentFolderId ?? "root";
  const folders = data.foldersByParentId[key] ?? [];

  const breadcrumbs = useMemo<IBreadcrumb[]>(() => {
    if (!parentFolderId) return [];

    const result: IBreadcrumb[] = [];
    let currentId: string | null = parentFolderId;

    while (currentId) {
      const folder: ILocalFolder | undefined = data.foldersById[currentId];
      if (!folder) break;
      result.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentFolderId;
    }

    return result;
  }, [data, parentFolderId]);

  return { data: folders, breadcrumbs, isLoading };
};
