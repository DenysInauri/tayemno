import srp from "secure-remote-password/client";
import {
  generateSalt,
  deriveKey,
  KDF_ITERATIONS,
  KDF_MEMORY_BYTES,
  KDF_PARALLELISM,
} from "../deriveKey";
import { SymmetricCrypto } from "../SymmetricCrypto";
import type { IChangePasswordRequest } from "@tayemno/shared";

interface IParams {
  email: string;
  newPassword: string;
  privateKey: string;
}

export const buildChangePasswordPayload = async ({
  email,
  newPassword,
  privateKey,
}: IParams): Promise<IChangePasswordRequest> => {
  const srpSalt = srp.generateSalt();
  const srpPrivateKey = srp.derivePrivateKey(
    srpSalt,
    email.toLowerCase(),
    newPassword,
  );
  const srpVerifier = srp.deriveVerifier(srpPrivateKey);

  const kdfSalt = await generateSalt();
  const kek = await deriveKey({
    password: newPassword,
    saltHex: kdfSalt,
    iterations: KDF_ITERATIONS,
    memoryLimit: KDF_MEMORY_BYTES,
  });

  const encryptedPrivateKey = await SymmetricCrypto.encrypt(privateKey, kek);

  return {
    srpSalt,
    srpVerifier,
    kdfSalt,
    kdfAlgorithm: "argon2id",
    kdfMemoryKib: KDF_MEMORY_BYTES / 1024,
    kdfIterations: KDF_ITERATIONS,
    kdfParallelism: KDF_PARALLELISM,
    encryptedPrivateKey: encryptedPrivateKey.ciphertext,
    privateKeyNonce: encryptedPrivateKey.nonce,
  };
};
