export interface User {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  name: string;

  srpSalt: string;
  srpVerifier: string;

  kdfSalt: string;
  kdfAlgorithm: "argon2id";
  kdfMemoryKib: number;
  kdfIterations: number;
  kdfParallelism: number;

  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyNonce: string;

  createdAt: string;
  updatedAt: string;
}

export interface NewUser {
  username: string;
  email: string;
  name: string;
  srpSalt: string;
  srpVerifier: string;
  kdfSalt: string;
  kdfAlgorithm: "argon2id";
  kdfMemoryKib: number;
  kdfIterations: number;
  kdfParallelism: number;
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
}

export interface Folder {
  id: string;
  ownerId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewFolder {
  ownerId: string;
  parentId?: string | null;
  name: string;
}

export interface FolderKeyShare {
  id: string;
  folderId: string;
  userId: string;
  symmetricKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewFolderKeyShare {
  folderId: string;
  userId: string;
  symmetricKey: string;
}

export interface Vault {
  id: string;
  ownerId: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  s3Key: string;
  contentNonce: string;
  encryptedName: string;
  symmetricKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewVault {
  ownerId: string;
  folderId?: string | null;
  name: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  s3Key: string;
  contentNonce: string;
  encryptedName: string;
  symmetricKey?: string | null;
}

export interface VaultKeyShare {
  id: string;
  vaultId: string;
  userId: string;
  symmetricKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewVaultKeyShare {
  vaultId: string;
  userId: string;
  symmetricKey: string;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
}

export interface ICheckUsernameParams {
  username: string;
}

export interface ICheckUsernameResponse {
  isFree: boolean;
}

export interface ICheckPasswordBreachParams {
  hash: string;
}

export interface ICheckPasswordBreachResponse {
  count: number;
}

export interface IRegisterRequest extends NewUser {}

export interface IRegisterResponse {
  message: string;
  email: string;
}

export interface IVerifyEmailRequest {
  email: string;
  code: string;
}

export interface IVerifyEmailResponse {
  message: string;
  userId: string;
}

export interface IResendVerificationRequest {
  email: string;
}

export interface IResendVerificationResponse {
  message: string;
}

export interface ICheckEmailParams {
  email: string;
}

export interface ICheckEmailResponse {
  isFree: boolean;
}

export interface ISignInInitRequest {
  identifier: string;
}

export interface ISignInInitResponse {
  username: string;
  srpSalt: string;
  serverPublicEphemeral: string;
}

export interface ISignInVerifyRequest {
  username: string;
  clientPublicEphemeral: string;
  clientSessionProof: string;
}

export interface ISignInUserData {
  id: string;
  username: string;
  email: string;
  name: string;
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
  kdfSalt: string;
  kdfAlgorithm: "argon2id";
  kdfMemoryKib: number;
  kdfIterations: number;
  kdfParallelism: number;
}

export interface ISignInVerifyResponse {
  serverSessionProof: string;
  token: string;
  user: ISignInUserData;
}

export interface IKeyPair {
  publicKey: string;
  privateKey: string;
}
