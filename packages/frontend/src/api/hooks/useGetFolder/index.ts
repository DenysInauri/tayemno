import type { IGetFolderResponse } from "@tayemno/shared";
import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const useGetFolder = (folderId: string | null) => {
  const { workspace } = useAuth();

  const query = useApiGet<IGetFolderResponse>(
    [QueryKeyEnum.FOLDER, folderId],
    `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders/${folderId}`,
    { enabled: !!workspace && !!folderId },
  );

  return { ...query, data: query.data?.folder ?? null };
};
