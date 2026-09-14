import type {
  IResendVerificationRequest,
  IResendVerificationResponse,
} from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostResendVerification = () => {
  return useApiPost<IResendVerificationRequest, IResendVerificationResponse>(
    EndpointEnum.RESEND_VERIFICATION,
  );
};
