import type { TFunction } from "i18next";
import type { IAuditLogPayload } from "@tayemno/shared";

export const formatAuditDescription = (
  payload: IAuditLogPayload,
  t: TFunction,
): string => {
  const params = {
    actorName: payload.actorName,
    folderName: payload.context?.folderName ?? "",
    vaultName: payload.context?.vaultName ?? "",
    itemName: payload.context?.movedFolderName ?? "",
    source: payload.context?.sourceFolderName ?? "",
    target: payload.context?.targetFolderName ?? "",
    memberName: payload.context?.memberName ?? "",
    memberEmail: payload.context?.memberEmail ?? "",
    role: payload.context?.role ?? "",
  };

  const key = `auditLogs.descriptions.${payload.action}`;
  const result = t(key, params);

  if (result === key) {
    return `${payload.actorName}: ${payload.action}`;
  }

  return result;
};
