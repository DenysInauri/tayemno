import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { IMoveVaultRequest, IMoveVaultResponse } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { useGetFolderKeyAsMember } from "../useGetFolderKeyAsMember";
import type { ILocalVault } from "../../../types/local";

interface IEncryptedSymmetricKey {
  encryptedSymmetricKey: string;
  symmetricKeyNonce: string | null;
}

export const useMoveVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const queryClient = useQueryClient();
  const { getFolderKey } = useGetFolderKeyAsMember();
  const [isMoving, setIsMoving] = useState(false);

  const encryptVaultKey = async (
    vaultKey: string,
    targetFolderId: string | null,
  ): Promise<IEncryptedSymmetricKey> => {
    if (!keyPair || !workspace || !user) {
      throw new Error("Not authenticated");
    }

    if (targetFolderId) {
      const folderSymmetricKey = await getFolderKey(targetFolderId);

      const encrypted = await SymmetricCrypto.encrypt(
        vaultKey,
        folderSymmetricKey,
      );

      return {
        encryptedSymmetricKey: encrypted.ciphertext,
        symmetricKeyNonce: encrypted.nonce,
      };
    }

    const encryptedSymmetricKey = await AsymmetricCrypto.encrypt(
      vaultKey,
      workspace.memberPublicKey,
    );

    return { encryptedSymmetricKey, symmetricKeyNonce: null };
  };

  const move = async (vault: ILocalVault, targetFolderId: string | null) => {
    if (!keyPair || !workspace || !user) return;

    setIsMoving(true);

    try {
      const { encryptedSymmetricKey, symmetricKeyNonce } =
        await encryptVaultKey(vault.symmetricKey, targetFolderId);

      const body: IMoveVaultRequest = {
        targetFolderId,
        encryptedSymmetricKey,
        symmetricKeyNonce,
      };

      await axios.patch<IMoveVaultResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace.id}${EndpointEnum.VAULTS}/${vault.id}/move`,
        body,
      );

      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.VAULTS, workspace.id, vault.folderId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.VAULTS, workspace.id, targetFolderId],
      });
    } finally {
      setIsMoving(false);
    }
  };

  return { move, isMoving };
};
