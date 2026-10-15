import type { IDeleteFolderAclResponse } from "@tayemno/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useDeleteFolderAcl = (folderId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useMutation<IDeleteFolderAclResponse, Error, string>({
    mutationFn: async (userId: string) => {
      const { data } = await axios.delete<IDeleteFolderAclResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.FOLDERS}/${folderId}/acl/${userId}`,
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
