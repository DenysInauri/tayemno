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

export type WorkspaceRole = "owner" | "admin" | "member" | "external_member";

export type WorkspaceMemberStatus = "invited" | "active";

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
  encryptedMemberPrivateKey: string | null;
  status: WorkspaceMemberStatus;
  adminEncryptedUserPrivateKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewWorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  encryptedAdminPrivateKey?: string | null;
  encryptedMemberPrivateKey?: string | null;
  status?: WorkspaceMemberStatus;
  adminEncryptedUserPrivateKey?: string | null;
}

export interface Folder {
  id: string;
  workspaceId: string;
  parentFolderId: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  wrappedKey: string | null;
  wrappedKeyNonce: string | null;
  aclEncryptedFolderKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewFolder {
  workspaceId: string;
  parentFolderId?: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  wrappedKey?: string | null;
  wrappedKeyNonce?: string | null;
}

export interface FolderAcl {
  id: string;
  folderId: string;
  userId: string;
  encryptedFolderKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewFolderAcl {
  folderId: string;
  userId: string;
  encryptedFolderKey: string;
}

export interface Vault {
  id: string;
  workspaceId: string;
  folderId: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedMetadata: string;
  metadataNonce: string;

  s3Key: string;
  contentNonce: string;
  thumbnailS3Key: string | null;
  thumbnailNonce: string | null;
  encryptedSymmetricKey: string;
  symmetricKeyNonce: string | null;
  adminEncryptedSymmetricKey: string | null;
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

  s3Key: string;
  contentNonce: string;
  thumbnailS3Key?: string | null;
  thumbnailNonce?: string | null;
  encryptedSymmetricKey: string;
  symmetricKeyNonce?: string | null;
  adminEncryptedSymmetricKey?: string | null;
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
  encryptedMemberPrivateKey: string | null;
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
  forcePasswordChange: boolean;
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
  wrappedKey: string | null;
  wrappedKeyNonce: string | null;
  aclEncryptedFolderKey: string;
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

  s3Key: string;
  contentNonce: string;
  encryptedSymmetricKey: string;
  symmetricKeyNonce?: string | null;
  adminEncryptedSymmetricKey: string;
  thumbnailS3Key?: string | null;
  thumbnailNonce?: string | null;
}

export interface ICreateVaultResponse {
  vault: Vault;
}

export interface IGetVaultResponse {
  vault: Vault;
}

export interface IGetVaultDownloadUrlResponse {
  presignedUrl: string;
}

export interface IGetVaultThumbnailUrlResponse {
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
  acls: FolderAcl[];
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

export interface IMoveFolderRequest {
  newParentFolderId: string | null;
  wrappedKey: string | null;
  wrappedKeyNonce: string | null;
  encryptedSymmetricKey: string;
}

export interface IMoveFolderResponse {
  folder: Folder;
}

export interface ICreateFolderAclRequest {
  userId: string;
  encryptedFolderKey: string;
}

export interface ICreateFolderAclResponse {
  acl: FolderAcl;
}

export interface IDeleteFolderAclResponse {
  message: string;
}

export interface IFolderMemberItem {
  userId: string;
  name: string;
  email: string;
  inherited: boolean;
  ancestorFolderId?: string;
  ancestorEncryptedName?: string;
  ancestorNameNonce?: string;
  createdAt: string;
}

export interface IListFolderMembersResponse {
  members: IFolderMemberItem[];
}

export interface IBulkCreateFolderAclRequest {
  acls: ICreateFolderAclRequest[];
}

export interface IBulkCreateFolderAclResponse {
  acls: FolderAcl[];
}

export interface IMemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  publicKey: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  adminEncryptedUserPrivateKey: string | null;
  createdAt: string;
}

export type InvitableRole = Exclude<WorkspaceRole, "owner">;

export interface IInviteMemberRequest {
  email: string;
  name: string;
  role: InvitableRole;
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
  adminEncryptedUserPrivateKey: string;
  encryptedAdminPrivateKey: string | null;
  encryptedMemberPrivateKey: string | null;
  tempPassword: string;
  workspaceName: string;
}

export interface IInviteMemberResponse {
  member: IMemberItem;
}

export interface IListMembersResponse {
  members: IMemberItem[];
}

export interface IDeleteMembersRequest {
  memberIds: string[];
}

export interface IDeleteMembersResponse {
  message: string;
}

export interface IReinviteMemberRequest {
  srpSalt: string;
  srpVerifier: string;
  kdfSalt: string;
  kdfAlgorithm: "argon2id";
  kdfMemoryKib: number;
  kdfIterations: number;
  kdfParallelism: number;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
  tempPassword: string;
  workspaceName: string;
}

export interface IReinviteMemberResponse {
  message: string;
}

export interface IChangePasswordRequest {
  srpSalt: string;
  srpVerifier: string;
  kdfSalt: string;
  kdfAlgorithm: "argon2id";
  kdfMemoryKib: number;
  kdfIterations: number;
  kdfParallelism: number;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
}

export interface IChangePasswordResponse {
  message: string;
}

