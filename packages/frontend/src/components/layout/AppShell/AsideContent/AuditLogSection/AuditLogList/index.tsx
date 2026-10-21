import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { IDecryptedAuditLog } from "../../../../../../api/hooks/useGetAuditLogs";
import { AuditLogItem } from "../AuditLogItem";
import classes from "./index.module.css";

const ROW_HEIGHT = 72;

interface IProps {
  logs: IDecryptedAuditLog[];
}

export const AuditLogList = ({ logs }: IProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems[0]?.start ?? 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div ref={parentRef} className={classes.scrollContainer}>
      {paddingTop > 0 && <div style={{ height: paddingTop }} />}
      {virtualItems.map((virtualRow) => {
        const log = logs[virtualRow.index];
        return <AuditLogItem key={log.id} log={log} />;
      })}
      {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
    </div>
  );
};
