import type {
  IVerifyEmailRequest,
  IVerifyEmailResponse,
} from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostVerifyEmail = () => {
  return useApiPost<IVerifyEmailRequest, IVerifyEmailResponse>(
    EndpointEnum.VERIFY_EMAIL,
  );
};
