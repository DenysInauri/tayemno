import type { IInviteMemberRequest, IInviteMemberResponse } from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostInviteMember = () => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiPost<IInviteMemberRequest, IInviteMemberResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.MEMBERS}`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.MEMBERS] });
      },
    },
  );
};
