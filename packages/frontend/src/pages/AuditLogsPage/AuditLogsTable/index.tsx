import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { IAuditLogPayload } from "@tayemno/shared";
import type { IDecryptedAuditLog } from "../../../api/hooks/useGetAuditLogs";
import { Text } from "../../../components/ui/Text";
import classes from "./index.module.css";

const ROW_HEIGHT = 48;

interface IProps {
  logs: IDecryptedAuditLog[];
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

const formatTimestamp = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const AuditLogsTable = ({ logs }: IProps) => {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems[0]?.start ?? 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <span className={classes.colTimestamp}>{t("auditLogs.table.timestamp")}</span>
        <span className={classes.colActor}>{t("auditLogs.table.actor")}</span>
        <span className={classes.colAction}>{t("auditLogs.table.action")}</span>
        <span className={classes.colDetails}>{t("auditLogs.table.details")}</span>
        <span className={classes.colIp}>{t("auditLogs.table.ipAddress")}</span>
      </div>
      <div ref={parentRef} className={classes.body}>
        {paddingTop > 0 && <div style={{ height: paddingTop }} />}
        {virtualItems.map((virtualRow) => {
          const log = logs[virtualRow.index];
          return (
            <div key={log.id} className={classes.row}>
              <span className={classes.colTimestamp}>
                <Text size="sm">{formatTimestamp(log.createdAt)}</Text>
              </span>
              <span className={classes.colActor}>
                <Text size="sm" lineClamp={1}>{log.payload.actorName}</Text>
                <Text size="xs" c="dimmed" lineClamp={1}>{log.payload.actorEmail}</Text>
              </span>
              <span className={classes.colAction}>
                <Text size="sm">{t(`auditLogs.actions.${log.payload.action}`)}</Text>
              </span>
              <span className={classes.colDetails}>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  {formatContext(log.payload.context)}
                </Text>
              </span>
              <span className={classes.colIp}>
                <Text size="sm" c="dimmed">
                  {log.ipAddress ?? t("auditLogs.table.noIp")}
                </Text>
              </span>
            </div>
          );
        })}
        {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
      </div>
    </div>
  );
};
