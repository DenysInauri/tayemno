import { useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Table } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { ILocalFolder, ILocalVault } from "../../../types/local";
import { FolderListItem } from "../FolderListItem";
import { VaultListItem } from "../VaultListItem";
import { TableSkeleton } from "../TableSkeleton";

type ListItem =
  | { type: "folder"; data: ILocalFolder }
  | { type: "vault"; data: ILocalVault };

const ROW_HEIGHT = 48;

interface IProps {
  folders: ILocalFolder[];
  vaults: ILocalVault[];
  isLoading: boolean;
}

export const VirtualizedFileTable = ({
  folders,
  vaults,
  isLoading,
}: IProps) => {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  const items = useMemo<ListItem[]>(
    () => [
      ...folders.map((f) => ({ type: "folder" as const, data: f })),
      ...vaults.map((v) => ({ type: "vault" as const, data: v })),
    ],
    [folders, vaults],
  );

  const virtualizer = useVirtualizer({
    count: items.length,
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
    <div ref={parentRef} style={{ flex: 1, overflow: "auto" }}>
      <Table highlightOnHover>
        <Table.Thead
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "var(--mantine-color-body)",
          }}
        >
          <Table.Tr>
            <Table.Th>{t("files.columns.name")}</Table.Th>
            <Table.Th visibleFrom="sm">{t("files.columns.size")}</Table.Th>
            <Table.Th visibleFrom="sm">
              {t("files.columns.modified")}
            </Table.Th>
            <Table.Th w={40} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: paddingTop, padding: 0, border: "none" }} />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const item = items[virtualRow.index];
                return item.type === "folder" ? (
                  <FolderListItem key={item.data.id} folder={item.data} />
                ) : (
                  <VaultListItem key={item.data.id} vault={item.data} />
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td
                    style={{ height: paddingBottom, padding: 0, border: "none" }}
                  />
                </tr>
              )}
            </>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
};
