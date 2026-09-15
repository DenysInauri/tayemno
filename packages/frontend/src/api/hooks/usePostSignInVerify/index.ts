import type {
  ISignInVerifyRequest,
  ISignInVerifyResponse,
} from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostSignInVerify = () => {
  return useApiPost<ISignInVerifyRequest, ISignInVerifyResponse>(
    EndpointEnum.SIGN_IN_VERIFY,
  );
};
