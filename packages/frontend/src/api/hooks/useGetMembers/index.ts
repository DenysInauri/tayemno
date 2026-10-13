import type { IListMembersResponse } from "@tayemno/shared";
import { useQuery } from "@tanstack/react-query";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useGetMembers = () => {
  const { workspace } = useAuth();

  return useQuery<IListMembersResponse>({
    queryKey: [QueryKeyEnum.MEMBERS, workspace?.id],
    queryFn: async () => {
      const { data } = await axios.get<IListMembersResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.MEMBERS}`,
      );
      return data;
    },
    enabled: !!workspace,
  });
};
