import type { IGetFolderTreeResponse } from "@tayemno/shared";

import { useApiGet } from "../useApiGet";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useGetFolderTree = (enabled: boolean) => {
  const { workspace } = useAuth();

  const query = useApiGet<IGetFolderTreeResponse>(
    [QueryKeyEnum.FOLDER_TREE],
    `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders/tree`,
    { enabled: enabled && !!workspace },
  );

  return { ...query, data: query.data?.folders ?? [] };
};
