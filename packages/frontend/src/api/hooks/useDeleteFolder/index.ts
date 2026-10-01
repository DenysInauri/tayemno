import { useQueryClient } from "@tanstack/react-query";
import type { IDeleteFolderResponse } from "@tayemno/shared";
import { useApiDelete } from "../useApiDelete";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const useDeleteFolder = (folderId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  const mutation = useApiDelete<IDeleteFolderResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders/${folderId}`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDERS] });
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDER_SIZE] });
      },
    },
  );

  return { deleteFolder: mutation.mutate, isDeleting: mutation.isPending };
};
