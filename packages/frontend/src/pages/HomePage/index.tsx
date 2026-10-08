import { useState, useEffect } from "react";
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
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const HomePage = () => {
  const routeParams = useParams<{ folderId: string }>();

  const folderId = routeParams.folderId ?? null;

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSearchQuery("");
  }, [folderId]);

  const { data: folders, isLoading: foldersLoading } = useFolders(folderId, { searchQuery });
  const { data: vaults, isLoading: vaultsLoading } = useVaults(folderId, { searchQuery });
  const { data: breadcrumbs, isLoading: breadcrumbsLoading } =
    useBreadcrumbs(folderId);

  const isLoading = foldersLoading || vaultsLoading;
  const hasNoResults = !isLoading && folders.length === 0 && vaults.length === 0;
  const isEmpty = hasNoResults && !searchQuery;
  const isSearchEmpty = hasNoResults && !!searchQuery;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: SizeEnum.MD,
        gap: SizeEnum.MD,
      }}
    >
      <FileToolbar
        folderId={folderId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div style={{ minHeight: 20 }}>
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
        />
      )}
    </div>
  );
};
