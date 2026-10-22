import { useState, useCallback } from "react";
import type { IAuditLogPayload, IGetAuditLogsResponse } from "@tayemno/shared";
import { axios } from "../../../api/axios";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";
import { decryptEntries } from "../../../api/hooks/useGetAuditLogs/decryptEntries";
import type { IDecryptedAuditLog } from "../../../api/hooks/useGetAuditLogs";

interface IFilters {
  dateFrom: string | null;
  dateTo: string | null;
  actionType: string | null;
  userId: string | null;
}

const formatContext = (context?: IAuditLogPayload["context"]): string => {
  if (!context) return "";
  const parts: string[] = [];
  if (context.folderName) parts.push(context.folderName);
  if (context.vaultName) parts.push(context.vaultName);
  if (context.movedFolderName) parts.push(context.movedFolderName);
  if (context.targetFolderName) parts.push(`→ ${context.targetFolderName}`);
  if (context.sourceFolderName) parts.push(`← ${context.sourceFolderName}`);
  if (context.memberName) parts.push(context.memberName);
  if (context.memberEmail) parts.push(context.memberEmail);
  if (context.role) parts.push(context.role);
  return parts.join(" ");
};

const escapeCsv = (value: string): string => {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildCsv = (logs: IDecryptedAuditLog[]): string => {
  const header = "Timestamp,Actor Name,Actor Email,Action,Details,IP Address";
  const rows = logs.map((log) =>
    [
      log.createdAt,
      escapeCsv(log.payload.actorName),
      escapeCsv(log.payload.actorEmail),
      log.payload.action,
      escapeCsv(formatContext(log.payload.context)),
      log.ipAddress ?? "",
    ].join(","),
  );
  return [header, ...rows].join("\n");
};

const downloadBlob = (csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const useExportCsv = () => {
  const { workspace, keyPair } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = useCallback(
    async (filters: IFilters) => {
      if (!workspace?.encryptedAdminPrivateKey || !keyPair) return;
      setIsExporting(true);

      try {
        const allEntries: IGetAuditLogsResponse["logs"] = [];
        let cursor: string | undefined;

        while (true) {
          const params = new URLSearchParams();
          if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
          if (filters.dateTo) params.set("dateTo", filters.dateTo);
          if (filters.actionType) params.set("actionType", filters.actionType);
          if (filters.userId) params.set("userId", filters.userId);
          if (cursor) params.set("cursor", cursor);
          params.set("limit", "100");

          const { data } = await axios.get<IGetAuditLogsResponse>(
            `${EndpointEnum.WORKSPACES}/${workspace.id}${EndpointEnum.AUDIT_LOGS}?${params}`,
          );

          allEntries.push(...data.logs);
          if (!data.nextCursor) break;
          cursor = data.nextCursor;
        }

        const decrypted = await decryptEntries({
          entries: allEntries,
          adminPublicKey: workspace.adminPublicKey,
          encryptedAdminPrivateKey: workspace.encryptedAdminPrivateKey,
          userPublicKey: keyPair.publicKey,
          userPrivateKey: keyPair.privateKey,
        });

        downloadBlob(buildCsv(decrypted));
      } finally {
        setIsExporting(false);
      }
    },
    [workspace, keyPair],
  );

  return { exportCsv, isExporting };
};
