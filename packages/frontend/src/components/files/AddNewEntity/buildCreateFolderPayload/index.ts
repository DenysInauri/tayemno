import { SymmetricCrypto } from "../../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../../utils/crypto/AsymmetricCrypto";

interface IParams {
  name: string;
  folderId: string | null;
  adminPublicKey: string;
  userPublicKey: string;
  getFolderKey: (id: string) => Promise<string>;
}

export const buildCreateFolderPayload = async ({
  name,
  folderId,
  adminPublicKey,
  userPublicKey,
  getFolderKey,
}: IParams) => {
  const folderKey = await SymmetricCrypto.generateKey();
  const adminEncryptedKey = await AsymmetricCrypto.encrypt(
    folderKey,
    adminPublicKey,
  );
  const aclEncryptedKey = await AsymmetricCrypto.encrypt(
    folderKey,
    userPublicKey,
  );

  let wrappedKey: string | null = null;
  let wrappedKeyNonce: string | null = null;

  if (folderId) {
    const parentKey = await getFolderKey(folderId);
    const wrapped = await SymmetricCrypto.encrypt(folderKey, parentKey);
    wrappedKey = wrapped.ciphertext;
    wrappedKeyNonce = wrapped.nonce;
  }

  const encrypted = await SymmetricCrypto.encrypt(name, folderKey);

  return {
    encryptedName: encrypted.ciphertext,
    nameNonce: encrypted.nonce,
    encryptedSymmetricKey: adminEncryptedKey,
    wrappedKey,
    wrappedKeyNonce,
    aclEncryptedFolderKey: aclEncryptedKey,
    parentFolderId: folderId,
  };
};
