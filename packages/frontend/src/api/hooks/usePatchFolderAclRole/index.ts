import type { FolderRole, IUpdateFolderAclRoleResponse } from "@tayemno/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

interface IMutationParams {
  userId: string;
  role: FolderRole;
}

export const usePatchFolderAclRole = (folderId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useMutation<IUpdateFolderAclRoleResponse, Error, IMutationParams>({
    mutationFn: async ({ userId, role }: IMutationParams) => {
      const { data } = await axios.patch<IUpdateFolderAclRoleResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.FOLDERS}/${folderId}/acl/${userId}/role`,
        { role },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.FOLDER_MEMBERS, workspace?.id, folderId],
      });
    },
  });
};
