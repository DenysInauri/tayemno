import type { IListFolderMembersResponse } from "@tayemno/shared";
import { useQuery } from "@tanstack/react-query";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useGetFolderMembers = (folderId: string | null) => {
  const { workspace } = useAuth();

  return useQuery<IListFolderMembersResponse>({
    queryKey: [QueryKeyEnum.FOLDER_MEMBERS, workspace?.id, folderId],
    queryFn: async () => {
      const { data } = await axios.get<IListFolderMembersResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.FOLDERS}/${folderId}/members`,
      );
      return data;
    },
    enabled: !!workspace && !!folderId,
  });
};
