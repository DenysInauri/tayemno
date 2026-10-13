import type { IReinviteMemberRequest, IReinviteMemberResponse } from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostReinviteMember = (memberId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiPost<IReinviteMemberRequest, IReinviteMemberResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.MEMBERS}/${memberId}/reinvite`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.MEMBERS] });
      },
    },
  );
};
