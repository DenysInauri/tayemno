import type { IAuditLogPayload } from "@tayemno/shared";
import { SymmetricCrypto } from "../SymmetricCrypto";
import { AsymmetricCrypto } from "../AsymmetricCrypto";

interface IEncryptedEntry {
  encryptedPayload: string;
  payloadNonce: string;
  encryptedKey: string;
}

export const decryptAuditLog = async (
  entry: IEncryptedEntry,
  adminPublicKeyHex: string,
  adminPrivateKeyHex: string,
): Promise<IAuditLogPayload> => {
  const symmetricKey = await AsymmetricCrypto.decrypt(
    entry.encryptedKey,
    adminPublicKeyHex,
    adminPrivateKeyHex,
  );
  const json = await SymmetricCrypto.decrypt(
    { ciphertext: entry.encryptedPayload, nonce: entry.payloadNonce },
    symmetricKey,
  );
  return JSON.parse(json);
};
