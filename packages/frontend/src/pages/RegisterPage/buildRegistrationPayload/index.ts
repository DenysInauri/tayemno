import srp from "secure-remote-password/client";
import {
  generateSalt,
  deriveKey,
  KDF_ITERATIONS,
  KDF_MEMORY_BYTES,
  KDF_PARALLELISM,
} from "../../../utils/crypto/deriveKey";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";

interface IParams {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
}

export const buildRegistrationPayload = async ({
  name,
  email,
  password,
  workspaceName,
}: IParams) => {
  const srpSalt = srp.generateSalt();
  const srpPrivateKey = srp.derivePrivateKey(
    srpSalt,
    email.toLowerCase(),
    password,
  );
  const srpVerifier = srp.deriveVerifier(srpPrivateKey);

  const deriveKeySalt = await generateSalt();
  const userDeriveKey = await deriveKey({
    password,
    saltHex: deriveKeySalt,
    iterations: KDF_ITERATIONS,
    memoryLimit: KDF_MEMORY_BYTES,
  });

  const userKeyPair = await AsymmetricCrypto.generateKeyPair();
  const encryptedPrivateKey = await SymmetricCrypto.encrypt(
    userKeyPair.privateKey,
    userDeriveKey,
  );

  const workspaceAdminKeyPair = await AsymmetricCrypto.generateKeyPair();
  const encryptedWorkspaceAdminPrivateKey = await AsymmetricCrypto.encrypt(
    workspaceAdminKeyPair.privateKey,
    userKeyPair.publicKey,
  );

  const workspaceMemberKeyPair = await AsymmetricCrypto.generateKeyPair();
  const encryptedWorkspaceMemberPrivateKey = await AsymmetricCrypto.encrypt(
    workspaceMemberKeyPair.privateKey,
    userKeyPair.publicKey,
  );

  return {
    userKeyPair,
    payload: {
      name,
      email,
      srpSalt,
      srpVerifier,
      kdfSalt: deriveKeySalt,
      kdfAlgorithm: "argon2id" as const,
      kdfMemoryKib: KDF_MEMORY_BYTES / 1024,
      kdfIterations: KDF_ITERATIONS,
      kdfParallelism: KDF_PARALLELISM,
      publicKey: userKeyPair.publicKey,
      encryptedPrivateKey: encryptedPrivateKey.ciphertext,
      privateKeyNonce: encryptedPrivateKey.nonce,
      workspaceName,
      workspaceAdminPublicKey: workspaceAdminKeyPair.publicKey,
      workspaceMemberPublicKey: workspaceMemberKeyPair.publicKey,
      encryptedWorkspaceAdminPrivateKey,
      encryptedWorkspaceMemberPrivateKey,
    },
  };
};
