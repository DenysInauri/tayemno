import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { IDecryptedAuditLog } from "../../../api/hooks/useGetAuditLogs";
import { formatAuditDescription } from "../../../utils/formatAuditDescription";
import { Text } from "../../../components/ui/Text";
import classes from "./index.module.css";

const ROW_HEIGHT = 48;

interface IProps {
  logs: IDecryptedAuditLog[];
}

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
        <span className={classes.colEvent}>{t("auditLogs.table.event")}</span>
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
              <span className={classes.colEvent}>
                <Text size="sm" lineClamp={1}>
                  {formatAuditDescription(log.payload, t)}
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
