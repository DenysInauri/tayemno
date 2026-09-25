import { useQueryClient } from "@tanstack/react-query";
import type { ICreateFolderRequest, ICreateFolderResponse } from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const usePostCreateFolder = () => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiPost<ICreateFolderRequest, ICreateFolderResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDERS] });
      },
    },
  );
};
