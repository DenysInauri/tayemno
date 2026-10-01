import { useQueryClient } from "@tanstack/react-query";
import type { IDeleteVaultResponse } from "@tayemno/shared";
import { useApiDelete } from "../useApiDelete";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useDeleteVault = (vaultId: string) => {
  const queryClient = useQueryClient();

  const mutation = useApiDelete<IDeleteVaultResponse>(
    `${EndpointEnum.VAULTS}/${vaultId}`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.VAULTS] });
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDER_SIZE] });
      },
    },
  );

  return { deleteVault: mutation.mutate, isDeleting: mutation.isPending };
};
