import type { IGetFolderSizeResponse } from "@tayemno/shared";

import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const useGetFolderSize = (folderId: string) => {
  const { workspace } = useAuth();

  return useApiGet<IGetFolderSizeResponse>(
    [QueryKeyEnum.FOLDER_SIZE, folderId],
    `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders/${folderId}/size`,
    { enabled: !!workspace },
  );
};
