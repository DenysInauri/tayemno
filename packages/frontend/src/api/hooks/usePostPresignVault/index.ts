import type { IPresignVaultRequest, IPresignVaultResponse } from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostPresignVault = () => {
  return useApiPost<IPresignVaultRequest, IPresignVaultResponse>(
    EndpointEnum.VAULTS_PRESIGN,
  );
};
