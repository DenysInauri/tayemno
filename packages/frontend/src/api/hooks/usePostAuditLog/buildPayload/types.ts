import { AuditActionEnum } from "@tayemno/shared";
import type { IAuditLogPayload } from "@tayemno/shared";
import type { ILocalFolder, ILocalVault } from "../../../../types/local";

export interface IFolderOpenedParams {
  action: AuditActionEnum.FOLDER_OPENED;
  folderId: string;
  folderName: string;
}

export interface IFolderCreatedParams {
  action: AuditActionEnum.FOLDER_CREATED;
  folderId: string | null;
  folderName: string;
}

export interface IVaultCreatedParams {
  action: AuditActionEnum.VAULT_CREATED;
  folderId: string | null;
  vaultId: string;
  vaultName: string;
}

export interface IVaultDeletedParams {
  action: AuditActionEnum.VAULT_DELETED;
  vault: ILocalVault;
}

export interface IVaultPreviewedParams {
  action: AuditActionEnum.VAULT_PREVIEWED;
  vault: ILocalVault;
}

export interface IVaultDownloadedParams {
  action: AuditActionEnum.VAULT_DOWNLOADED;
  vault: ILocalVault;
}

export interface IFolderDownloadedParams {
  action: AuditActionEnum.FOLDER_DOWNLOADED;
  folder: ILocalFolder;
}

export interface IVaultMovedFromParams {
  action: AuditActionEnum.VAULT_MOVED_FROM;
  vault: ILocalVault;
  currentFolderName: string;
  targetFolder: ILocalFolder | null;
}

export interface IVaultMovedToParams {
  action: AuditActionEnum.VAULT_MOVED_TO;
  vault: ILocalVault;
  currentFolderName: string;
  targetFolder: ILocalFolder | null;
}

export interface IFolderMovedFromParams {
  action: AuditActionEnum.FOLDER_MOVED_FROM;
  folder: ILocalFolder;
  currentFolderName: string;
  targetFolder: ILocalFolder | null;
}

export interface IFolderMovedToParams {
  action: AuditActionEnum.FOLDER_MOVED_TO;
  folder: ILocalFolder;
  currentFolderName: string;
  targetFolder: ILocalFolder | null;
}

export interface IFolderAclCreatedParams {
  action: AuditActionEnum.FOLDER_ACL_CREATED;
  folderId: string;
  memberName: string;
  memberEmail: string;
}

export interface IFolderAclRevokedParams {
  action: AuditActionEnum.FOLDER_ACL_REVOKED;
  folderId: string;
  memberName: string;
  memberEmail: string;
}

export interface IFolderAclRoleChangedParams {
  action: AuditActionEnum.FOLDER_ACL_ROLE_CHANGED;
  folderId: string;
  memberName: string;
  memberEmail: string;
  role: string;
}

export interface IMemberInvitedParams {
  action: AuditActionEnum.MEMBER_INVITED;
  memberName: string;
  memberEmail: string;
  role: string;
}

export interface IMemberRemovedParams {
  action: AuditActionEnum.MEMBER_REMOVED;
  memberName: string;
  memberEmail: string;
}

export interface IAuthSignInParams {
  action: AuditActionEnum.AUTH_SIGN_IN;
}

export interface IAuthSignOutParams {
  action: AuditActionEnum.AUTH_SIGN_OUT;
}

export interface IAuthPasswordChangedParams {
  action: AuditActionEnum.AUTH_PASSWORD_CHANGED;
}

export type LogActionParams =
  | IFolderOpenedParams
  | IFolderCreatedParams
  | IVaultCreatedParams
  | IVaultDeletedParams
  | IVaultPreviewedParams
  | IVaultDownloadedParams
  | IFolderDownloadedParams
  | IVaultMovedFromParams
  | IVaultMovedToParams
  | IFolderMovedFromParams
  | IFolderMovedToParams
  | IFolderAclCreatedParams
  | IFolderAclRevokedParams
  | IFolderAclRoleChangedParams
  | IMemberInvitedParams
  | IMemberRemovedParams
  | IAuthSignInParams
  | IAuthSignOutParams
  | IAuthPasswordChangedParams;

export interface IBuildResult {
  folderId: string | null;
  vaultId: string | null;
  context: IAuditLogPayload["context"];
}
