import { useRef, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Table } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";

import { AuditActionEnum, type IFolderPermissions } from "@tayemno/shared";
import type { ILocalFolder, ILocalVault } from "../../../types/local";
import { FolderListItem } from "../FolderListItem";
import { VaultListItem } from "../VaultListItem";
import { PreviewOverlay, type IPreviewOverlayHandle } from "../PreviewOverlay";
import { TableSkeleton } from "../TableSkeleton";
import { useSelectedItem } from "../../../hooks/useSelectedItem";
import { usePostAuditLog } from "../../../api/hooks/usePostAuditLog";
import classes from "./index.module.css";

type ListItem = ILocalFolder | ILocalVault;

const ROW_HEIGHT = 48;

interface IProps {
  folders: ILocalFolder[];
  vaults: ILocalVault[];
  permissions: IFolderPermissions;
  isLoading: boolean;
  currentFolderName: string;
}

export const VirtualizedFileTable = (
  { folders, vaults, permissions, isLoading, currentFolderName }: IProps,
) => {
  const { t } = useTranslation();
  const { folderId } = useParams<{ folderId: string }>();
  const parentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<IPreviewOverlayHandle>(null);
  const { selectedItem, selectFolder, selectVault, clearSelection } =
    useSelectedItem();
  const { logAction } = usePostAuditLog();
  const prevFolderIdRef = useRef(folderId);

  const handlePreview = useCallback(
    (vault: ILocalVault) => {
      previewRef.current?.open(vault);
      logAction({ action: AuditActionEnum.VAULT_PREVIEWED, vault });
    },
    [logAction],
  );

  useEffect(() => {
    if (prevFolderIdRef.current !== folderId) {
      prevFolderIdRef.current = folderId;
      clearSelection();
    }
  }, [folderId, clearSelection]);

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
                        permissions={permissions}
                        onPreview={handlePreview}
                        selected={selectedItem?.id === item.id}
                        onSelect={() => selectVault(item.id)}
                        currentFolderName={currentFolderName}
                      />
                    );
                  }

                  return (
                    <FolderListItem
                      key={item.id}
                      folder={item}
                      permissions={permissions}
                      selected={selectedItem?.id === item.id}
                      onSelect={() => selectFolder(item.id)}
                      currentFolderName={currentFolderName}
                    />
                  );
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
