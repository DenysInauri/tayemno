import { useMemo } from "react";
import keyBy from "lodash/keyBy";
import type {
  IGetFoldersResponse,
  Folder,
  IBreadcrumbItem,
} from "@tayemno/shared";
import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const useGetFolders = (parentFolderId: string | null = null) => {
  const { workspace } = useAuth();

  if (!workspace)
    return {
      data: [] as Folder[],
      dataMap: {} as Record<string, Folder>,
      breadcrumbs: [] as IBreadcrumbItem[],
    };

  const url = parentFolderId
    ? `${EndpointEnum.WORKSPACES}/${workspace.id}/folders?parentFolderId=${parentFolderId}`
    : `${EndpointEnum.WORKSPACES}/${workspace.id}/folders`;

  const query = useApiGet<IGetFoldersResponse>(
    [QueryKeyEnum.FOLDERS, parentFolderId],
    url,
  );

  const folders = query.data?.folders ?? [];
  const breadcrumbs = query.data?.breadcrumbs ?? [];
  const foldersById: Record<string, Folder> = useMemo(
    () => keyBy(folders, "id"),
    [folders],
  );

  return { ...query, data: folders, dataMap: foldersById, breadcrumbs };
};
