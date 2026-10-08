export interface User {
  id: string;
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

export type WorkspaceRole = "owner" | "admin" | "member";

export interface Workspace {
  id: string;
  encryptedName: string;
  adminPublicKey: string;
  memberPublicKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewWorkspace {
  encryptedName: string;
  adminPublicKey: string;
  memberPublicKey: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  encryptedAdminPrivateKey: string | null;
  encryptedMemberPrivateKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewWorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  encryptedAdminPrivateKey?: string | null;
  encryptedMemberPrivateKey: string;
}

export interface Folder {
  id: string;
  workspaceId: string;
  parentFolderId: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewFolder {
  workspaceId: string;
  parentFolderId?: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
}

export interface FolderMember {
  id: string;
  folderId: string;
  userId: string;
  encryptedSymmetricKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewFolderMember {
  folderId: string;
  userId: string;
  encryptedSymmetricKey: string;
}

export interface Vault {
  id: string;
  workspaceId: string;
  folderId: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedMetadata: string;
  metadataNonce: string;
  encryptedSizeBytes: number;
  s3Key: string;
  contentNonce: string;
  encryptedSymmetricKey: string;
  symmetricKeyNonce: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewVault {
  workspaceId: string;
  folderId?: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedMetadata: string;
  metadataNonce: string;
  encryptedSizeBytes: number;
  s3Key: string;
  contentNonce: string;
  encryptedSymmetricKey: string;
  symmetricKeyNonce?: string | null;
}

export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
}

export interface ICheckPasswordBreachParams {
  hash: string;
}

export interface ICheckPasswordBreachResponse {
  count: number;
}

export interface IRegisterRequest extends NewUser {
  workspaceEncryptedName: string;
  workspaceAdminPublicKey: string;
  workspaceMemberPublicKey: string;
  encryptedWorkspaceAdminPrivateKey: string;
  encryptedWorkspaceMemberPrivateKey: string;
}

export interface IRegisterResponse {
  message: string;
  email: string;
}

export interface IVerifyEmailRequest {
  email: string;
  code: string;
}

export interface IWorkspaceData {
  id: string;
  encryptedName: string;
  adminPublicKey: string;
  memberPublicKey: string;
  encryptedAdminPrivateKey: string | null;
  encryptedMemberPrivateKey: string;
  role: WorkspaceRole;
}

export interface IVerifyEmailResponse {
  message: string;
  token: string;
  user: ISignInUserData;
  workspace: IWorkspaceData;
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
  email: string;
  srpSalt: string;
  serverPublicEphemeral: string;
}

export interface ISignInVerifyRequest {
  email: string;
  clientPublicEphemeral: string;
  clientSessionProof: string;
}

export interface ISignInUserData {
  id: string;
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
  workspace: IWorkspaceData;
}

export interface IKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ICreateFolderRequest {
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  memberEncryptedSymmetricKey: string;
  parentFolderId?: string | null;
}

export interface ICreateFolderResponse {
  folder: Folder;
}

export interface IPresignVaultRequest {
  workspaceId: string;
  folderId?: string | null;
}

export interface IPresignVaultResponse {
  presignedUrl: string;
  s3Key: string;
}

export interface ICreateVaultRequest {
  workspaceId: string;
  folderId?: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedMetadata: string;
  metadataNonce: string;
  encryptedSizeBytes: number;
  s3Key: string;
  contentNonce: string;
  encryptedSymmetricKey: string;
  symmetricKeyNonce?: string | null;
}

export interface ICreateVaultResponse {
  vault: Vault;
}

export interface IGetVaultDownloadUrlResponse {
  presignedUrl: string;
}

export interface IDeleteVaultResponse {
  message: string;
}

export interface IDeleteFolderResponse {
  message: string;
}

export interface IMoveVaultRequest {
  targetFolderId: string | null;
  encryptedSymmetricKey: string;
  symmetricKeyNonce: string | null;
}

export interface IMoveVaultResponse {
  vault: Vault;
}

export interface IGetAllFoldersResponse {
  folders: Folder[];
}

export interface IGetAllVaultsResponse {
  vaults: Vault[];
}

export interface IGetFoldersByParentResponse {
  folders: Folder[];
}

export interface IGetFolderResponse {
  folder: Folder;
}

export interface IGetBreadcrumbsResponse {
  breadcrumbs: Folder[];
}

export interface IGetVaultsByFolderResponse {
  vaults: Vault[];
}

