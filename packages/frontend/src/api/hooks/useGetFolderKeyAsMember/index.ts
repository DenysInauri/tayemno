import { useCallback } from "react";
import type { IGetFolderResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";

const cache = new Map<string, Promise<string>>();

export const useGetFolderKeyAsMember = () => {
  const { workspace, keyPair } = useAuth();

  const getFolderKey = useCallback(
    (folderId: string): Promise<string> => {
      const cacheKey = `member:${workspace!.id}:${folderId}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const promise = (async () => {
        const { data } = await axios.get<IGetFolderResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}/${folderId}`,
        );

        const { folder } = data;

        if (folder.aclEncryptedFolderKey) {
          return AsymmetricCrypto.decrypt(
            folder.aclEncryptedFolderKey,
            keyPair!.publicKey,
            keyPair!.privateKey,
          );
        }

        if (
          folder.wrappedKey &&
          folder.wrappedKeyNonce &&
          folder.parentFolderId
        ) {
          const parentKey = await getFolderKey(folder.parentFolderId);
          return SymmetricCrypto.decrypt(
            { ciphertext: folder.wrappedKey, nonce: folder.wrappedKeyNonce },
            parentKey,
          );
        }

        throw new Error("No ACL or wrapped key available for this folder");
      })();

      promise.catch(() => cache.delete(cacheKey));
      cache.set(cacheKey, promise);

      return promise;
    },
    [workspace, keyPair],
  );

  return { getFolderKey };
};
