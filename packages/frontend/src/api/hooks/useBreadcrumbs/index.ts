import { useQuery } from "@tanstack/react-query";
import type { IGetBreadcrumbsResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { useDecryptFolderAsMember } from "../useDecryptFolderAsMember";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export interface IBreadcrumb {
  id: string;
  name: string;
}

export const useBreadcrumbs = (folderId: string | null) => {
  const { workspace } = useAuth();
  const { decrypt } = useDecryptFolderAsMember();

  const query = useQuery<IBreadcrumb[]>({
    queryKey: [QueryKeyEnum.BREADCRUMBS, workspace?.id, folderId],
    queryFn: async () => {
      const { data } = await axios.get<IGetBreadcrumbsResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}/${folderId}/breadcrumbs`,
      );

      const decrypted = await Promise.all(data.breadcrumbs.map(decrypt));
      return decrypted.map((folder) => ({ id: folder.id, name: folder.name }));
    },
    enabled: !!workspace && folderId !== null,
  });

  return { data: query.data ?? [], isLoading: query.isLoading };
};
