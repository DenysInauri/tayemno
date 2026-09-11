import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

interface IIsUsernameFreeResponse {
  isFree: boolean;
}

export const useGetIsUsernameFree = (username: string) => {
  return useApiGet<IIsUsernameFreeResponse>(
    [QueryKeyEnum.IS_USERNAME_FREE, username],
    `${EndpointEnum.CHECK_USERNAME}/${username}`,
    { enabled: username.length > 0 },
  );
};
