import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { EmptyState } from "../../components/files/EmptyState";
import { SearchEmptyState } from "../../components/files/SearchEmptyState";
import { FolderBreadcrumbs } from "../../components/files/FolderBreadcrumbs";
import { VirtualizedFileTable } from "../../components/files/VirtualizedFileTable";
import { FileToolbar } from "../../components/files/FileToolbar";
import { BreadcrumbSkeleton } from "../../components/files/BreadcrumbSkeleton";
import { Drawer } from "../../components/ui/Drawer";
import { AsideContent } from "../../components/layout/AppShell/AsideContent";
import { useFolders } from "../../api/hooks/useFolders";
import { useVaults } from "../../api/hooks/useVaults";
import { useBreadcrumbs } from "../../api/hooks/useBreadcrumbs";
import { useAuth } from "../../contexts/AuthContext";
import { usePostAuditLog } from "../../api/hooks/usePostAuditLog";
import { AuditActionEnum, ROOT_FOLDER_NAME } from "@tayemno/shared";
import classes from "./index.module.css";

export const HomePage = () => {
  const routeParams = useParams<{ folderId: string }>();
  const folderId = routeParams.folderId ?? null;

  const { t } = useTranslation();
  const { workspace } = useAuth();
  const { logAction } = usePostAuditLog();
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure();

  useEffect(() => {
    setSearchQuery("");
  }, [folderId]);

  useEffect(() => {
    closeDrawer();
  }, [folderId, closeDrawer]);

  const { data: folders, permissions, isLoading: foldersLoading } = useFolders(folderId, { searchQuery });
  const { data: vaults, isLoading: vaultsLoading } = useVaults(folderId, { searchQuery });
  const { data: breadcrumbs, isLoading: breadcrumbsLoading } = useBreadcrumbs(folderId);
  const loggedFolderRef = useRef<string | null>(null);

  useEffect(() => {
    if (!folderId || loggedFolderRef.current === folderId) return;
    const current = breadcrumbs[breadcrumbs.length - 1];
    if (!current) return;
    loggedFolderRef.current = folderId;
    logAction({ action: AuditActionEnum.FOLDER_OPENED, folderId, folderName: current.name });
  }, [folderId, breadcrumbs, logAction]);

  const onSettingsClick = permissions.canManageMembers ? openDrawer : undefined;
  const isLoading = foldersLoading || vaultsLoading;
  const hasNoResults = !isLoading && folders.length === 0 && vaults.length === 0;
  const isEmpty = hasNoResults && !searchQuery;
  const isSearchEmpty = hasNoResults && !!searchQuery;

  return (
    <div className={classes.page}>
      <FileToolbar
        folderId={folderId}
        permissions={permissions}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSettingsClick={onSettingsClick}
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
          permissions={permissions}
          isLoading={isLoading}
          currentFolderName={breadcrumbs[breadcrumbs.length - 1]?.name ?? ROOT_FOLDER_NAME}
        />
      )}

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        size={500}
        title={t("aside.title")}
      >
        <AsideContent isAdmin={isAdmin} permissions={permissions} />
      </Drawer>
    </div>
  );
};
