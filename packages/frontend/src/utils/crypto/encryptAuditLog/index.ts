import type { IAuditLogPayload } from "@tayemno/shared";
import { SymmetricCrypto } from "../SymmetricCrypto";
import { AsymmetricCrypto } from "../AsymmetricCrypto";

interface IEncryptedAuditLog {
  encryptedPayload: string;
  payloadNonce: string;
  encryptedKey: string;
}

export const encryptAuditLog = async (
  payload: IAuditLogPayload,
  adminPublicKeyHex: string,
): Promise<IEncryptedAuditLog> => {
  const symmetricKey = await SymmetricCrypto.generateKey();
  const { ciphertext, nonce } = await SymmetricCrypto.encrypt(
    JSON.stringify(payload),
    symmetricKey,
  );
  const encryptedKey = await AsymmetricCrypto.encrypt(
    symmetricKey,
    adminPublicKeyHex,
  );
  return { encryptedPayload: ciphertext, payloadNonce: nonce, encryptedKey };
};
