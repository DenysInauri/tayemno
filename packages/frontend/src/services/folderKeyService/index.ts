import type { IGetFolderResponse } from "@tayemno/shared";

import { axios } from "../../api";
import { EndpointEnum } from "../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../utils/crypto/AsymmetricCrypto";

const cache = new Map<string, string>();

export const getFolderKey = async (
  folderId: string,
  workspaceId: string,
  userPublicKey: string,
  userPrivateKey: string,
): Promise<string> => {
  const cached = cache.get(folderId);
  if (cached) return cached;

  const { data } = await axios.get<IGetFolderResponse>(
    `${EndpointEnum.WORKSPACES}/${workspaceId}/folders/${folderId}`,
  );

  const folderKey = await AsymmetricCrypto.decrypt(
    data.folder.encryptedSymmetricKey,
    userPublicKey,
    userPrivateKey,
  );

  cache.set(folderId, folderKey);

  return folderKey;
};

export const clearFolderKeyCache = () => {
  cache.clear();
};
