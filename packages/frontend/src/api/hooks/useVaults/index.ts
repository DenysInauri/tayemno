import { useQuery } from "@tanstack/react-query";
import type { IGetVaultsByFolderResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { useDecryptVault } from "../useDecryptVault";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import type { ILocalVault } from "../../../types/local";

const collator = new Intl.Collator(undefined, { numeric: true });

export const useVaults = (folderId: string | null) => {
  const { workspace } = useAuth();
  const { decrypt: decryptVault } = useDecryptVault();

  const query = useQuery<ILocalVault[]>({
    queryKey: [QueryKeyEnum.VAULTS, workspace?.id, folderId],
    queryFn: async () => {
      const params = folderId ? `?folderId=${folderId}` : "";

      const vaultsRes = await axios.get<IGetVaultsByFolderResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.VAULTS}${params}`,
      );

      const decrypted = await Promise.all(
        vaultsRes.data.vaults.map(decryptVault),
      );

      return decrypted.sort((a, b) => collator.compare(a.name, b.name));
    },
    enabled: !!workspace,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
};
