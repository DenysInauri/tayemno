import type { Vault } from "@tayemno/shared";

import { useAuth } from "../../../contexts/AuthContext";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { getFolderKey } from "../../../services/folderKeyService";

export const useDecryptVaultKey = () => {
  const { keyPair, workspace, user } = useAuth();

  const decryptVaultKey = async (vault: Vault): Promise<string> => {
    if (!keyPair || !workspace || !user) {
      throw new Error("Not authenticated");
    }

    if (vault.folderId && vault.symmetricKeyNonce) {
      const folderKey = await getFolderKey(
        vault.folderId,
        workspace.id,
        user.publicKey,
        keyPair.privateKey,
      );

      return SymmetricCrypto.decrypt(
        { nonce: vault.symmetricKeyNonce, ciphertext: vault.encryptedSymmetricKey },
        folderKey,
      );
    }

    const memberPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedMemberPrivateKey,
      user.publicKey,
      keyPair.privateKey,
    );

    return AsymmetricCrypto.decrypt(
      vault.encryptedSymmetricKey,
      workspace.memberPublicKey,
      memberPrivateKey,
    );
  };

  return { decryptVaultKey };
};
