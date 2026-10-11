import type { ILocalVault } from "../../../types/local";
import { axios } from "../../../api";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";
import { fetchWithProgress } from "../../../utils/fetchWithProgress";

interface IParams {
  vault: ILocalVault;
  workspaceId: string;
  signal: AbortSignal;
  onFetchProgress: (ratio: number) => void;
  onDecryptProgress: (ratio: number) => void;
}

export const downloadAndDecryptVault = async ({
  vault,
  workspaceId,
  signal,
  onFetchProgress,
  onDecryptProgress,
}: IParams) => {
  const { data } = await axios.get<{ presignedUrl: string }>(
    `${EndpointEnum.WORKSPACES}/${workspaceId}${EndpointEnum.VAULTS}/${vault.id}/download-url`,
  );

  const encryptedBlob = await fetchWithProgress(
    data.presignedUrl,
    onFetchProgress,
    signal,
  );

  return StreamCrypto.decryptFile(
    encryptedBlob,
    vault.symmetricKey,
    vault.contentNonce,
    onDecryptProgress,
    signal,
  );
};
