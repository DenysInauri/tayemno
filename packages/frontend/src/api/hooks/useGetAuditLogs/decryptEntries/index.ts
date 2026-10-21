import type { IAuditLogEntry, IAuditLogPayload } from "@tayemno/shared";
import { AsymmetricCrypto } from "../../../../utils/crypto/AsymmetricCrypto";
import { decryptAuditLog } from "../../../../utils/crypto/decryptAuditLog";

export interface IDecryptedAuditLog {
  id: string;
  ipAddress: string | null;
  createdAt: string;
  payload: IAuditLogPayload;
}

interface IDecryptParams {
  entries: IAuditLogEntry[];
  adminPublicKey: string;
  encryptedAdminPrivateKey: string;
  userPublicKey: string;
  userPrivateKey: string;
}

export const decryptEntries = async ({
  entries,
  adminPublicKey,
  encryptedAdminPrivateKey,
  userPublicKey,
  userPrivateKey,
}: IDecryptParams): Promise<IDecryptedAuditLog[]> => {
  const adminPrivateKey = await AsymmetricCrypto.decrypt(
    encryptedAdminPrivateKey,
    userPublicKey,
    userPrivateKey,
  );

  const results = await Promise.all(
    entries.map((entry) =>
      decryptAuditLog(entry, adminPublicKey, adminPrivateKey)
        .then((payload) => ({
          id: entry.id,
          ipAddress: entry.ipAddress,
          createdAt: entry.createdAt,
          payload,
        }))
        .catch(() => null),
    ),
  );

  return results.filter((r): r is IDecryptedAuditLog => r !== null);
};
