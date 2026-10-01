import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  Vault,
  IMoveVaultRequest,
  IMoveVaultResponse,
} from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { getFolderKey } from "../../../services/folderKeyService";
import { useDecryptVaultKey } from "../useDecryptVaultKey";

interface IEncryptedSymmetricKey {
  encryptedSymmetricKey: string;
  symmetricKeyNonce: string | null;
}

export const useMoveVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const { decryptVaultKey } = useDecryptVaultKey();
  const queryClient = useQueryClient();
  const [isMoving, setIsMoving] = useState(false);

  const encryptVaultKey = async (
    vaultKey: string,
    targetFolderId: string | null,
  ): Promise<IEncryptedSymmetricKey> => {
    if (!keyPair || !workspace || !user) {
      throw new Error("Not authenticated");
    }

    if (targetFolderId) {
      const folderKey = await getFolderKey(
        targetFolderId,
        workspace.id,
        user.publicKey,
        keyPair.privateKey,
      );

      const encrypted = await SymmetricCrypto.encrypt(vaultKey, folderKey);

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

  const move = async (vault: Vault, targetFolderId: string | null) => {
    if (!keyPair || !workspace || !user) return;

    setIsMoving(true);

    try {
      const vaultKey = await decryptVaultKey(vault);
      const { encryptedSymmetricKey, symmetricKeyNonce } =
        await encryptVaultKey(vaultKey, targetFolderId);

      const body: IMoveVaultRequest = {
        targetFolderId,
        encryptedSymmetricKey,
        symmetricKeyNonce,
      };

      await axios.patch<IMoveVaultResponse>(
        `${EndpointEnum.VAULTS}/${vault.id}/move`,
        body,
      );

      queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.VAULTS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDER_SIZE] });
      queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDER_TREE] });
    } finally {
      setIsMoving(false);
    }
  };

  return { move, isMoving };
};
