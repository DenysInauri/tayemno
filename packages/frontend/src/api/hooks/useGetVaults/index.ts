import type { IGetVaultsResponse, Vault } from "@tayemno/shared";
import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const useGetVaults = (
  folderId: string | null,
  workspaceId: string,
) => {
  const url = folderId
    ? `${EndpointEnum.VAULTS}?folderId=${folderId}`
    : `${EndpointEnum.VAULTS}?workspaceId=${workspaceId}`;

  const query = useApiGet<IGetVaultsResponse, Vault[]>(
    [QueryKeyEnum.VAULTS, folderId ?? "root"],
    url,
    { select: (data) => data.vaults },
  );

  return { ...query, data: query.data ?? [] };
};
