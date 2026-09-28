import type { IGetVaultsResponse, Vault } from "@tayemno/shared";
import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const useGetVaults = (folderId: string | null) => {
  const query = useApiGet<IGetVaultsResponse, Vault[]>(
    [QueryKeyEnum.VAULTS, folderId],
    `${EndpointEnum.VAULTS}?folderId=${folderId}`,
    {
      select: (data) => data.vaults,
      enabled: !!folderId,
    },
  );

  return { ...query, data: query.data ?? [] };
};
