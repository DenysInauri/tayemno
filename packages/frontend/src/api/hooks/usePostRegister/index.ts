import type { IRegisterRequest, IRegisterResponse } from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostRegister = () => {
  return useApiPost<IRegisterRequest, IRegisterResponse>(EndpointEnum.REGISTER);
};
