import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { IGetAuditLogsResponse } from "@tayemno/shared";
import { axios } from "../../../api/axios";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";
import { decryptEntries } from "../../../api/hooks/useGetAuditLogs/decryptEntries";
import { formatAuditDescription } from "../../../utils/formatAuditDescription";
import type { IDecryptedAuditLog } from "../../../api/hooks/useGetAuditLogs";

interface IFilters {
  dateFrom: string | null;
  dateTo: string | null;
  actionType: string | null;
  userId: string | null;
}

const escapeCsv = (value: string): string => {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

type TFn = ReturnType<typeof useTranslation>["t"];

const buildCsv = (logs: IDecryptedAuditLog[], t: TFn): string => {
  const header = "Timestamp,Event,IP Address";
  const rows = logs.map((log) =>
    [
      log.createdAt,
      escapeCsv(formatAuditDescription(log.payload, t)),
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
  const { t } = useTranslation();
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

        downloadBlob(buildCsv(decrypted, t));
      } finally {
        setIsExporting(false);
      }
    },
    [workspace, keyPair, t],
  );

  return { exportCsv, isExporting };
};
