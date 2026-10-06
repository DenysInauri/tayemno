import { useClaudeState } from "../../../contexts/ClaudeStateContext";

export const useVaults = (folderId: string | null) => {
  const { data, isLoading } = useClaudeState();

  const key = folderId ?? "root";
  const vaults = data.vaultsByFolderId[key] ?? [];

  return { data: vaults, isLoading };
};
