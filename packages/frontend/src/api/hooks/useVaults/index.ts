import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { IGetVaultsByFolderResponse, IFolderPermissions } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { useDecryptVaultAsMember } from "../useDecryptVaultAsMember";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import type { ILocalVault } from "../../../types/local";

interface IUseListOptions {
  searchQuery?: string;
}

interface IVaultQueryData {
  vaults: ILocalVault[];
  permissions: IFolderPermissions | null;
}

const collator = new Intl.Collator(undefined, { numeric: true });

export const useVaults = (folderId: string | null, options?: IUseListOptions) => {
  const { workspace } = useAuth();
  const { decrypt: decryptVault } = useDecryptVaultAsMember();

  const query = useQuery<IVaultQueryData>({
    queryKey: [QueryKeyEnum.VAULTS, workspace?.id, folderId],
    queryFn: async () => {
      const params = folderId ? `?folderId=${folderId}` : "";

      const vaultsRes = await axios.get<IGetVaultsByFolderResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.VAULTS}${params}`,
      );

      const decrypted = await Promise.all(
        vaultsRes.data.vaults.map(decryptVault),
      );

      return {
        vaults: decrypted.sort((a, b) => collator.compare(a.name, b.name)),
        permissions: vaultsRes.data.permissions ?? null,
      };
    },
    enabled: !!workspace,
  });

  const all = query.data?.vaults ?? [];

  const data = useMemo(() => {
    if (!options?.searchQuery || !options.searchQuery.length) return all;
    return all.filter((v) =>
      v.name.toLowerCase().includes(options.searchQuery!.toLowerCase()),
    );
  }, [all, options?.searchQuery]);

  return {
    data,
    permissions: query.data?.permissions ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
};
