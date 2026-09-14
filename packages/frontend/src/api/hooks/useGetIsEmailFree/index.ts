import type { ICheckEmailResponse } from "@tayemno/shared";
import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const useGetIsEmailFree = (email: string) => {
  return useApiGet<ICheckEmailResponse>(
    [QueryKeyEnum.IS_EMAIL_FREE, email],
    `${EndpointEnum.CHECK_EMAIL}/${email}`,
    { enabled: email.length > 0 },
  );
};
