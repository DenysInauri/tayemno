import { useCallback } from "react";
import type { IGetVaultResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";

const cache = new Map<string, Promise<string>>();

export const useGetVaultKeyAsAdmin = () => {
  const { workspace, keyPair } = useAuth();

  const getVaultKey = useCallback(
    (vaultId: string): Promise<string> => {
      const cacheKey = `admin:${workspace!.id}:${vaultId}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const promise = (async () => {
        const { data } = await axios.get<IGetVaultResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.VAULTS}/${vaultId}`,
        );

        if (!workspace) throw new Error("Failed to get vault key");
        if (!keyPair) throw new Error("Failed to get vault key");
        if (!workspace.encryptedAdminPrivateKey)
          throw new Error("Failed to get vault key");
        if (!data.vault.adminEncryptedSymmetricKey)
          throw new Error("No admin-encrypted key available for this vault");

        const adminPrivateKey = await AsymmetricCrypto.decrypt(
          workspace.encryptedAdminPrivateKey,
          keyPair.publicKey,
          keyPair.privateKey,
        );

        return AsymmetricCrypto.decrypt(
          data.vault.adminEncryptedSymmetricKey,
          workspace!.adminPublicKey,
          adminPrivateKey,
        );
      })();

      promise.catch(() => cache.delete(cacheKey));
      cache.set(cacheKey, promise);

      return promise;
    },
    [workspace, keyPair],
  );

  return { getVaultKey };
};
