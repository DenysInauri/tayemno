import type {
  ISignInInitRequest,
  ISignInInitResponse,
} from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostSignInInit = () => {
  return useApiPost<ISignInInitRequest, ISignInInitResponse>(
    EndpointEnum.SIGN_IN_INIT,
  );
};
