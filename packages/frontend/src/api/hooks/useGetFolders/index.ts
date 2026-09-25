import type { IGetFoldersResponse, Folder } from "@tayemno/shared";
import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const useGetFolders = () => {
  const { workspace } = useAuth();

  const query = useApiGet<IGetFoldersResponse, Folder[]>(
    [QueryKeyEnum.FOLDERS],
    `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders`,
    { select: (data) => data.folders },
  );

  return { ...query, data: query.data ?? [] };
};
