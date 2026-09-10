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
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
}
