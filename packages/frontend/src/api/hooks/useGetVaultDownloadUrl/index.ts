import { axios } from "../../axios";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

interface IDownloadUrlResponse {
  presignedUrl: string;
}

export const getVaultDownloadUrl = async (
  workspaceId: string,
  vaultId: string,
): Promise<string> => {
  const { data } = await axios.get<IDownloadUrlResponse>(
    `${EndpointEnum.WORKSPACES}/${workspaceId}${EndpointEnum.VAULTS}/${vaultId}/download-url`,
  );
  return data.presignedUrl;
};
