import srp from "secure-remote-password/client";
import {
  generateSalt,
  deriveKey,
  KDF_ITERATIONS,
  KDF_MEMORY_BYTES,
  KDF_PARALLELISM,
} from "../../../../utils/crypto/deriveKey";
import { AsymmetricCrypto } from "../../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../../utils/crypto/SymmetricCrypto";
import type {
  IInviteMemberRequest,
  InvitableRole,
  IKeyPair,
  IWorkspaceData,
} from "@tayemno/shared";

interface IParams {
  email: string;
  name: string;
  role: InvitableRole;
  tempPassword: string;
  workspaceName: string;
  adminKeyPair: IKeyPair;
  workspace: IWorkspaceData;
}

export const buildInvitePayload = async ({
  email,
  name,
  role,
  tempPassword,
  workspaceName,
  adminKeyPair,
  workspace,
}: IParams): Promise<IInviteMemberRequest> => {
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

  const newUserKeyPair = await AsymmetricCrypto.generateKeyPair();
  const encryptedPrivateKey = await SymmetricCrypto.encrypt(
    newUserKeyPair.privateKey,
    kek,
  );

  const adminEncryptedUserPrivateKey = await AsymmetricCrypto.encrypt(
    newUserKeyPair.privateKey,
    workspace.adminPublicKey,
  );

  let encryptedAdminPrivateKey: string | null = null;
  let encryptedMemberPrivateKey: string | null = null;

  if (role === "admin") {
    const workspaceAdminPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedAdminPrivateKey!,
      adminKeyPair.publicKey,
      adminKeyPair.privateKey,
    );
    encryptedAdminPrivateKey = await AsymmetricCrypto.encrypt(
      workspaceAdminPrivateKey,
      newUserKeyPair.publicKey,
    );

    const workspaceMemberPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedMemberPrivateKey!,
      adminKeyPair.publicKey,
      adminKeyPair.privateKey,
    );
    encryptedMemberPrivateKey = await AsymmetricCrypto.encrypt(
      workspaceMemberPrivateKey,
      newUserKeyPair.publicKey,
    );
  } else if (role === "member") {
    const workspaceMemberPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedMemberPrivateKey!,
      adminKeyPair.publicKey,
      adminKeyPair.privateKey,
    );
    encryptedMemberPrivateKey = await AsymmetricCrypto.encrypt(
      workspaceMemberPrivateKey,
      newUserKeyPair.publicKey,
    );
  }

  return {
    email,
    name,
    role,
    srpSalt,
    srpVerifier,
    kdfSalt,
    kdfAlgorithm: "argon2id",
    kdfMemoryKib: KDF_MEMORY_BYTES / 1024,
    kdfIterations: KDF_ITERATIONS,
    kdfParallelism: KDF_PARALLELISM,
    publicKey: newUserKeyPair.publicKey,
    encryptedPrivateKey: encryptedPrivateKey.ciphertext,
    privateKeyNonce: encryptedPrivateKey.nonce,
    adminEncryptedUserPrivateKey,
    encryptedAdminPrivateKey,
    encryptedMemberPrivateKey,
    tempPassword,
    workspaceName,
  };
};
