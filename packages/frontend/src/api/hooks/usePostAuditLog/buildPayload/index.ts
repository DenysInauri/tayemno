import { AuditActionEnum, ROOT_FOLDER_NAME } from "@tayemno/shared";
import type { ILocalFolder } from "../../../../types/local";
import type { LogActionParams, IBuildResult } from "./types";

export type { LogActionParams } from "./types";

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

    case AuditActionEnum.FOLDER_ACL_REVOKED:
      return { folderId: params.folderId, vaultId: null, context: { memberName: params.memberName, memberEmail: params.memberEmail } };

    case AuditActionEnum.MEMBER_INVITED:
      return { folderId: null, vaultId: null, context: { memberName: params.memberName, memberEmail: params.memberEmail, role: params.role } };

    case AuditActionEnum.MEMBER_REMOVED:
      return { folderId: null, vaultId: null, context: { memberName: params.memberName, memberEmail: params.memberEmail } };

    case AuditActionEnum.AUTH_SIGN_IN:
    case AuditActionEnum.AUTH_SIGN_OUT:
    case AuditActionEnum.AUTH_PASSWORD_CHANGED:
      return { folderId: null, vaultId: null, context: undefined };
  }
};
