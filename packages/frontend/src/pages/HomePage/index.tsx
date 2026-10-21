import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

import { EmptyState } from "../../components/files/EmptyState";
import { SearchEmptyState } from "../../components/files/SearchEmptyState";
import { FolderBreadcrumbs } from "../../components/files/FolderBreadcrumbs";
import { VirtualizedFileTable } from "../../components/files/VirtualizedFileTable";
import { FileToolbar } from "../../components/files/FileToolbar";
import { BreadcrumbSkeleton } from "../../components/files/BreadcrumbSkeleton";
import { useFolders } from "../../api/hooks/useFolders";
import { useVaults } from "../../api/hooks/useVaults";
import { useBreadcrumbs } from "../../api/hooks/useBreadcrumbs";
import { AuditActionEnum, ROOT_FOLDER_NAME } from "@tayemno/shared";
import { usePostAuditLog } from "../../api/hooks/usePostAuditLog";
import classes from "./index.module.css";

export const HomePage = () => {
  const routeParams = useParams<{ folderId: string }>();

  const folderId = routeParams.folderId ?? null;

  const { logAction } = usePostAuditLog();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery("");
  }, [folderId]);

  const { data: folders, isLoading: foldersLoading } = useFolders(folderId, { searchQuery });
  const { data: vaults, isLoading: vaultsLoading } = useVaults(folderId, { searchQuery });
  const { data: breadcrumbs, isLoading: breadcrumbsLoading } =
    useBreadcrumbs(folderId);
  const loggedFolderRef = useRef<string | null>(null);

  useEffect(() => {
    if (!folderId || loggedFolderRef.current === folderId) return;
    const current = breadcrumbs[breadcrumbs.length - 1];
    if (!current) return;
    loggedFolderRef.current = folderId;
    logAction({ action: AuditActionEnum.FOLDER_OPENED, folderId, folderName: current.name });
  }, [folderId, breadcrumbs, logAction]);

  const isLoading = foldersLoading || vaultsLoading;
  const hasNoResults = !isLoading && folders.length === 0 && vaults.length === 0;
  const isEmpty = hasNoResults && !searchQuery;
  const isSearchEmpty = hasNoResults && !!searchQuery;

  return (
    <div className={classes.page}>
      <FileToolbar
        folderId={folderId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className={classes.breadcrumbWrapper}>
        {breadcrumbsLoading && folderId ? (
          <BreadcrumbSkeleton />
        ) : (
          <FolderBreadcrumbs breadcrumbs={breadcrumbs} />
        )}
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : isSearchEmpty ? (
        <SearchEmptyState />
      ) : (
        <VirtualizedFileTable
          folders={folders}
          vaults={vaults}
          isLoading={isLoading}
          currentFolderName={breadcrumbs[breadcrumbs.length - 1]?.name ?? ROOT_FOLDER_NAME}
        />
      )}
    </div>
  );
};
