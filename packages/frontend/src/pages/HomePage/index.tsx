import { useParams } from "react-router-dom";

import { EmptyState } from "../../components/files/EmptyState";
import { FolderBreadcrumbs } from "../../components/files/FolderBreadcrumbs";
import { VirtualizedFileTable } from "../../components/files/VirtualizedFileTable";
import { AddNewEntity } from "../../components/files/AddNewEntity";
import { BreadcrumbSkeleton } from "../../components/files/BreadcrumbSkeleton";
import { useFolders } from "../../api/hooks/useFolders";
import { useVaults } from "../../api/hooks/useVaults";
import { useBreadcrumbs } from "../../api/hooks/useBreadcrumbs";
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const HomePage = () => {
  const routeParams = useParams<{ folderId: string }>();

  const folderId = routeParams.folderId ?? null;

  const { data: folders, isLoading: foldersLoading } = useFolders(folderId);
  const { data: vaults, isLoading: vaultsLoading } = useVaults(folderId);
  const { data: breadcrumbs, isLoading: breadcrumbsLoading } =
    useBreadcrumbs(folderId);

  const isLoading = foldersLoading || vaultsLoading;
  const isEmpty = !isLoading && folders.length === 0 && vaults.length === 0;

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
      <div style={{ alignSelf: "flex-end" }}>
        <AddNewEntity folderId={folderId} />
      </div>

      <div style={{ minHeight: 20 }}>
        {breadcrumbsLoading && folderId ? (
          <BreadcrumbSkeleton />
        ) : (
          <FolderBreadcrumbs breadcrumbs={breadcrumbs} />
        )}
      </div>

      {isEmpty ? (
        <EmptyState />
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
