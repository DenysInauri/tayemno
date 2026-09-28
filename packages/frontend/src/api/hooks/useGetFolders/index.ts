import { useMemo } from "react";
import keyBy from "lodash/keyBy";
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

  const folders = query.data ?? [];
  const foldersById = useMemo(() => keyBy(folders, "id"), [folders]);

  return { ...query, data: folders, dataMap: foldersById };
};
