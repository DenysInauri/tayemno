import { useQueryClient } from "@tanstack/react-query";
import type { IDeleteVaultResponse } from "@tayemno/shared";
import { useApiDelete } from "../useApiDelete";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const useDeleteVault = (vaultId: string) => {
  const { workspace } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useApiDelete<IDeleteVaultResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.VAULTS}/${vaultId}`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [QueryKeyEnum.VAULTS],
        });
      },
    },
  );

  return { deleteVault: mutation.mutate, isDeleting: mutation.isPending };
};
