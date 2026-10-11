import { useCallback, useRef } from "react";
import type { IGetFolderResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";

const cache = new Map<string, Promise<string>>();

export const useGetFolderKeyAsAdmin = () => {
  const { workspace, keyPair } = useAuth();

  const getFolderKey = useCallback(
    (folderId: string): Promise<string> => {
      const cacheKey = `admin:${workspace!.id}:${folderId}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const promise = (async () => {
        const { data } = await axios.get<IGetFolderResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}/${folderId}`,
        );

        if (!workspace) throw new Error("Workspace not found");
        if (!workspace.encryptedAdminPrivateKey)
          throw new Error("Admin key not found");
        if (!keyPair) throw new Error("Key pair not found");

        const adminPrivateKey = await AsymmetricCrypto.decrypt(
          workspace.encryptedAdminPrivateKey,
          keyPair.publicKey,
          keyPair.privateKey,
        );

        return AsymmetricCrypto.decrypt(
          data.folder.encryptedSymmetricKey,
          workspace.adminPublicKey,
          adminPrivateKey,
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
