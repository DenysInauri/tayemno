import { useQueryClient } from "@tanstack/react-query";
import type { ICreateVaultRequest, ICreateVaultResponse } from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostCreateVault = () => {
  const queryClient = useQueryClient();

  return useApiPost<ICreateVaultRequest, ICreateVaultResponse>(
    EndpointEnum.VAULTS,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.VAULTS] });
      },
    },
  );
};
