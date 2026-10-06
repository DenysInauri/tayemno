import type {
  IPresignVaultRequest,
  IPresignVaultResponse,
} from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const usePostPresignVault = () => {
  const { workspace } = useAuth();
  return useApiPost<IPresignVaultRequest, IPresignVaultResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.VAULTS_PRESIGN}`,
  );
};
