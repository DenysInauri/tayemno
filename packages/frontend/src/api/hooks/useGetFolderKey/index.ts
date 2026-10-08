import { useCallback } from "react";
import type { IGetFolderResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";

const cache = new Map<string, Promise<string>>();

export const useGetFolderKey = () => {
  const { workspace, keyPair } = useAuth();

  const getFolderKey = useCallback(
    (folderId: string): Promise<string> => {
      const cacheKey = `${workspace!.id}:${folderId}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const promise = (async () => {
        const { data } = await axios.get<IGetFolderResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}/${folderId}`,
        );

        return AsymmetricCrypto.decrypt(
          data.folder.encryptedSymmetricKey,
          keyPair!.publicKey,
          keyPair!.privateKey,
        );
      })();

      promise.catch(() => cache.delete(cacheKey));
      cache.set(cacheKey, promise);

      return promise;
    },
    [workspace, keyPair],
  );

  return { getFolderKey };
};
