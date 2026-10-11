import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";

interface IParams {
  folderId: string | null;
  adminPublicKey: string;
  memberPublicKey: string;
  getFolderKey: (id: string) => Promise<string>;
}

export const buildVaultEncryptionKey = async ({
  folderId,
  adminPublicKey,
  memberPublicKey,
  getFolderKey,
}: IParams) => {
  const vaultKey = await SymmetricCrypto.generateKey();
  const adminEncryptedSymmetricKey = await AsymmetricCrypto.encrypt(
    vaultKey,
    adminPublicKey,
  );

  if (folderId) {
    const folderSymmetricKey = await getFolderKey(folderId);

    const encryptedVaultKey = await SymmetricCrypto.encrypt(
      vaultKey,
      folderSymmetricKey,
    );

    return {
      symmetricKey: vaultKey,
      encryptedSymmetricKey: encryptedVaultKey.ciphertext,
      symmetricKeyNonce: encryptedVaultKey.nonce,
      adminEncryptedSymmetricKey,
    };
  }

  const encryptedSymmetricKey = await AsymmetricCrypto.encrypt(
    vaultKey,
    memberPublicKey,
  );

  return {
    encryptedSymmetricKey,
    symmetricKeyNonce: null,
    symmetricKey: vaultKey,
    adminEncryptedSymmetricKey,
  };
};
