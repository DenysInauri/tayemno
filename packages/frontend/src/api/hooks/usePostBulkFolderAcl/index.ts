import type {
  IBulkCreateFolderAclRequest,
  IBulkCreateFolderAclResponse,
} from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useApiPost } from "../useApiPost";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostBulkFolderAcl = (folderId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiPost<IBulkCreateFolderAclRequest, IBulkCreateFolderAclResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.FOLDERS}/${folderId}/acl/bulk`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [QueryKeyEnum.FOLDER_MEMBERS, workspace?.id, folderId],
        });
      },
    },
  );
};
