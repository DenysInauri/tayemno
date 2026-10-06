import { Folder } from "@tayemno/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import type { ILocalFolder } from "../../../types/local";

export const useDecryptFolder = () => {
  const { keyPair } = useAuth();

  const decrypt = async (folder: Folder): Promise<ILocalFolder> => {
    if (!keyPair) throw new Error("Key pair not found");

    const folderKey = await AsymmetricCrypto.decrypt(
      folder.encryptedSymmetricKey,
      keyPair.publicKey,
      keyPair.privateKey,
    );

    const name = await SymmetricCrypto.decrypt(
      { nonce: folder.nameNonce, ciphertext: folder.encryptedName },
      folderKey,
    );

    return {
      id: folder.id,
      parentFolderId: folder.parentFolderId,
      workspaceId: folder.workspaceId,
      name,
      symmetricKey: folderKey,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  };

  return { decrypt };
};
