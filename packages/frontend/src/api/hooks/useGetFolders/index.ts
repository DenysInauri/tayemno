import type { IGetFoldersResponse, Folder } from "@tayemno/shared";
import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

type FolderWithKey = Folder & { symmetricKey: string };

export const useGetFolders = () => {
  const query = useApiGet<IGetFoldersResponse, FolderWithKey[]>(
    [QueryKeyEnum.FOLDERS],
    EndpointEnum.FOLDERS,
    { select: (data) => data.folders },
  );

  return { ...query, data: query.data ?? [] };
};
