import type {
  IChangePasswordRequest,
  IChangePasswordResponse,
} from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostChangePassword = () => {
  return useApiPost<IChangePasswordRequest, IChangePasswordResponse>(
    EndpointEnum.CHANGE_PASSWORD,
  );
};
