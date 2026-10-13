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
import type {
  IReinviteMemberRequest,
  IKeyPair,
  IWorkspaceData,
} from "@tayemno/shared";

interface IParams {
  email: string;
  tempPassword: string;
  workspaceName: string;
  adminEncryptedUserPrivateKey: string;
  adminKeyPair: IKeyPair;
  workspace: IWorkspaceData;
}

export const buildReinvitePayload = async ({
  email,
  tempPassword,
  workspaceName,
  adminEncryptedUserPrivateKey,
  adminKeyPair,
  workspace,
}: IParams): Promise<IReinviteMemberRequest> => {
  const workspaceAdminPrivateKey = await AsymmetricCrypto.decrypt(
    workspace.encryptedAdminPrivateKey!,
    adminKeyPair.publicKey,
    adminKeyPair.privateKey,
  );

  const userPrivateKey = await AsymmetricCrypto.decrypt(
    adminEncryptedUserPrivateKey,
    workspace.adminPublicKey,
    workspaceAdminPrivateKey,
  );

  const srpSalt = srp.generateSalt();
  const srpPrivateKey = srp.derivePrivateKey(
    srpSalt,
    email.toLowerCase(),
    tempPassword,
  );
  const srpVerifier = srp.deriveVerifier(srpPrivateKey);

  const kdfSalt = await generateSalt();
  const kek = await deriveKey({
    password: tempPassword,
    saltHex: kdfSalt,
    iterations: KDF_ITERATIONS,
    memoryLimit: KDF_MEMORY_BYTES,
  });

  const encryptedPrivateKey = await SymmetricCrypto.encrypt(
    userPrivateKey,
    kek,
  );

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
    tempPassword,
    workspaceName,
  };
};
