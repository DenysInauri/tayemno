import { useQueryClient } from "@tanstack/react-query";
import type { ICreateFolderRequest, ICreateFolderResponse } from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostCreateFolder = () => {
  const queryClient = useQueryClient();

  return useApiPost<ICreateFolderRequest, ICreateFolderResponse>(
    EndpointEnum.FOLDERS,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDERS] });
      },
    },
  );
};
