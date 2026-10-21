import {
  AuditActionEnum,
  ROOT_FOLDER_NAME,
  type IAuditLogPayload,
} from "@tayemno/shared";
import type { ILocalFolder, ILocalVault } from "../../../../types/local";

interface IFolderOpenedParams {
  action: AuditActionEnum.FOLDER_OPENED;
  folderId: string;
  folderName: string;
}

interface IFolderCreatedParams {
  action: AuditActionEnum.FOLDER_CREATED;
  folderId: string | null;
  folderName: string;
}

interface IVaultCreatedParams {
  action: AuditActionEnum.VAULT_CREATED;
  folderId: string | null;
  vaultId: string;
  vaultName: string;
}

interface IVaultDeletedParams {
  action: AuditActionEnum.VAULT_DELETED;
  vault: ILocalVault;
}

interface IVaultPreviewedParams {
  action: AuditActionEnum.VAULT_PREVIEWED;
  vault: ILocalVault;
}

interface IVaultDownloadedParams {
  action: AuditActionEnum.VAULT_DOWNLOADED;
  vault: ILocalVault;
}

interface IFolderDownloadedParams {
  action: AuditActionEnum.FOLDER_DOWNLOADED;
  folder: ILocalFolder;
}

interface IVaultMovedFromParams {
  action: AuditActionEnum.VAULT_MOVED_FROM;
  vault: ILocalVault;
  currentFolderName: string;
  targetFolder: ILocalFolder | null;
}

interface IVaultMovedToParams {
  action: AuditActionEnum.VAULT_MOVED_TO;
  vault: ILocalVault;
  currentFolderName: string;
  targetFolder: ILocalFolder | null;
}

interface IFolderMovedFromParams {
  action: AuditActionEnum.FOLDER_MOVED_FROM;
  folder: ILocalFolder;
  currentFolderName: string;
  targetFolder: ILocalFolder | null;
}

interface IFolderMovedToParams {
  action: AuditActionEnum.FOLDER_MOVED_TO;
  folder: ILocalFolder;
  currentFolderName: string;
  targetFolder: ILocalFolder | null;
}

interface IFolderAclCreatedParams {
  action: AuditActionEnum.FOLDER_ACL_CREATED;
  folderId: string;
  memberName: string;
  memberEmail: string;
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
  | IFolderAclCreatedParams;

interface IBuildResult {
  folderId: string | null;
  vaultId: string | null;
  context: IAuditLogPayload["context"];
}

const targetName = (f: ILocalFolder | null) => f?.name ?? ROOT_FOLDER_NAME;

export const buildPayload = (params: LogActionParams): IBuildResult => {
  switch (params.action) {
    case AuditActionEnum.FOLDER_OPENED:
      return { folderId: params.folderId, vaultId: null, context: { folderName: params.folderName } };

    case AuditActionEnum.FOLDER_CREATED:
      return { folderId: params.folderId, vaultId: null, context: { folderName: params.folderName } };

    case AuditActionEnum.VAULT_CREATED:
      return { folderId: params.folderId, vaultId: params.vaultId, context: { vaultName: params.vaultName } };

    case AuditActionEnum.VAULT_DELETED:
      return { folderId: params.vault.folderId ?? null, vaultId: params.vault.id, context: { vaultName: params.vault.name } };

    case AuditActionEnum.VAULT_PREVIEWED:
      return { folderId: params.vault.folderId ?? null, vaultId: params.vault.id, context: { vaultName: params.vault.name } };

    case AuditActionEnum.VAULT_DOWNLOADED:
      return { folderId: params.vault.folderId ?? null, vaultId: params.vault.id, context: { vaultName: params.vault.name } };

    case AuditActionEnum.FOLDER_DOWNLOADED:
      return { folderId: params.folder.parentFolderId ?? null, vaultId: null, context: { folderName: params.folder.name } };

    case AuditActionEnum.VAULT_MOVED_FROM:
      return {
        folderId: params.vault.folderId ?? null,
        vaultId: params.vault.id,
        context: { vaultName: params.vault.name, sourceFolderName: params.currentFolderName, targetFolderName: targetName(params.targetFolder) },
      };

    case AuditActionEnum.VAULT_MOVED_TO:
      return {
        folderId: params.targetFolder?.id ?? null,
        vaultId: params.vault.id,
        context: { vaultName: params.vault.name, sourceFolderName: params.currentFolderName },
      };

    case AuditActionEnum.FOLDER_MOVED_FROM:
      return {
        folderId: params.folder.parentFolderId ?? null,
        vaultId: null,
        context: { movedFolderName: params.folder.name, sourceFolderName: params.currentFolderName, targetFolderName: targetName(params.targetFolder) },
      };

    case AuditActionEnum.FOLDER_MOVED_TO:
      return {
        folderId: params.targetFolder?.id ?? null,
        vaultId: null,
        context: { movedFolderName: params.folder.name, sourceFolderName: params.currentFolderName },
      };

    case AuditActionEnum.FOLDER_ACL_CREATED:
      return { folderId: params.folderId, vaultId: null, context: { memberName: params.memberName, memberEmail: params.memberEmail } };
  }
};
