import type { IAuditLogPayload } from "@tayemno/shared";

export const formatAuditContext = (
  context?: IAuditLogPayload["context"],
): string => {
  if (!context) return "";

  const itemName = context.vaultName ?? context.movedFolderName ?? context.folderName;

  if (context.sourceFolderName && context.targetFolderName) {
    return itemName
      ? `${itemName}: ${context.sourceFolderName} → ${context.targetFolderName}`
      : `${context.sourceFolderName} → ${context.targetFolderName}`;
  }

  if (context.sourceFolderName) {
    return itemName
      ? `${itemName} (from ${context.sourceFolderName})`
      : context.sourceFolderName;
  }

  const parts: string[] = [];
  if (itemName) parts.push(itemName);
  if (context.targetFolderName) parts.push(`→ ${context.targetFolderName}`);
  if (context.memberName) parts.push(context.memberName);
  if (context.memberEmail) parts.push(`(${context.memberEmail})`);
  if (context.role) parts.push(context.role);
  return parts.join(" ");
};
