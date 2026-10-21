import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { SelectedClaudeTreeItemTypeEnum } from "../../enums/routing/SelectedClaudeTreeItemTypeEnum";

interface ISelectedFolder {
  type: SelectedClaudeTreeItemTypeEnum.FOLDER;
  id: string;
}

interface ISelectedVault {
  type: SelectedClaudeTreeItemTypeEnum.FILE;
  id: string;
}

export type SelectedItem = ISelectedFolder | ISelectedVault | null;

export const useSelectedItem = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get("select");
  let selectedItem: SelectedItem = null;

  if (raw) {
    const [type, id] = raw.split(":");
    if (type === SelectedClaudeTreeItemTypeEnum.FOLDER && id)
      selectedItem = { type: SelectedClaudeTreeItemTypeEnum.FOLDER, id };
    else if (type === SelectedClaudeTreeItemTypeEnum.FILE && id)
      selectedItem = { type: SelectedClaudeTreeItemTypeEnum.FILE, id };
  }

  const selectFolder = useCallback(
    (folderId: string) => {
      setSearchParams(
        { select: `${SelectedClaudeTreeItemTypeEnum.FOLDER}:${folderId}` },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const selectVault = useCallback(
    (vaultId: string) => {
      setSearchParams(
        { select: `${SelectedClaudeTreeItemTypeEnum.FILE}:${vaultId}` },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearSelection = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { selectedItem, selectFolder, selectVault, clearSelection };
};
