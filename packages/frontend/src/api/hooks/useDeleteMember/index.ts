import type { IDeleteMembersRequest, IDeleteMembersResponse } from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useDeleteMembers = () => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiPost<IDeleteMembersRequest, IDeleteMembersResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.MEMBERS}/delete`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.MEMBERS] });
      },
    },
  );
};
