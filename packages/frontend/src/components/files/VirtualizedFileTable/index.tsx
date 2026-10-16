import { useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Table } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { ILocalFolder, ILocalVault } from "../../../types/local";
import { FolderListItem } from "../FolderListItem";
import { VaultListItem } from "../VaultListItem";
import { PreviewOverlay, type IPreviewOverlayHandle } from "../PreviewOverlay";
import { TableSkeleton } from "../TableSkeleton";
import classes from "./index.module.css";

type ListItem = ILocalFolder | ILocalVault;

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
  const previewRef = useRef<IPreviewOverlayHandle>(null);

  const handlePreview = useCallback(
    (vault: ILocalVault) => previewRef.current?.open(vault),
    [],
  );

  const items = useMemo<ListItem[]>(
    () => [...folders, ...vaults],
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
    <>
      <div ref={parentRef} className={classes.scrollContainer}>
        <Table highlightOnHover>
          <Table.Thead className={classes.stickyHeader}>
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
                    <td
                      style={{ height: paddingTop, padding: 0, border: "none" }}
                    />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const item = items[virtualRow.index];
                  const isFile = "mimeType" in item;

                  if (isFile) {
                    return (
                      <VaultListItem
                        key={item.id}
                        vault={item}
                        onPreview={handlePreview}
                      />
                    );
                  }

                  return <FolderListItem key={item.id} folder={item} />;
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td
                      style={{
                        height: paddingBottom,
                        padding: 0,
                        border: "none",
                      }}
                    />
                  </tr>
                )}
              </>
            )}
          </Table.Tbody>
        </Table>
      </div>
      <PreviewOverlay ref={previewRef} vaults={vaults} />
    </>
  );
};
