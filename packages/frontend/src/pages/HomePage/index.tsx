import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Table } from "@mantine/core";

import { Stack } from "../../components/ui/Stack";
import { Group } from "../../components/ui/Group";
import { EmptyState } from "../../components/files/EmptyState";
import { FoldersList } from "../../components/files/FoldersList";
import { FolderBreadcrumbs } from "../../components/files/FolderBreadcrumbs";
import { VaultsList } from "../../components/files/VaultsList";
import { AddNewEntity } from "../../components/files/AddNewEntity";
import { TableSkeleton } from "../../components/files/TableSkeleton";
import { BreadcrumbSkeleton } from "../../components/files/BreadcrumbSkeleton";
import { useFolders } from "../../api/hooks/useFolders";
import { useVaults } from "../../api/hooks/useVaults";
import { useBreadcrumbs } from "../../api/hooks/useBreadcrumbs";
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const HomePage = () => {
  const routeParams = useParams<{ folderId: string }>();
  const { t } = useTranslation();

  const folderId = routeParams.folderId ?? null;

  const { data: folders, isLoading: foldersLoading } = useFolders(folderId);
  const { data: vaults, isLoading: vaultsLoading } = useVaults(folderId);
  const { data: breadcrumbs, isLoading: breadcrumbsLoading } =
    useBreadcrumbs(folderId);

  const isLoading = foldersLoading || vaultsLoading;
  const isEmpty = !isLoading && folders.length === 0 && vaults.length === 0;

  return (
    <Stack gap={SizeEnum.MD} p={SizeEnum.MD}>
      <Group justify="space-between">
        {breadcrumbsLoading && folderId ? (
          <BreadcrumbSkeleton />
        ) : (
          <FolderBreadcrumbs breadcrumbs={breadcrumbs} />
        )}
        <AddNewEntity folderId={folderId} />
      </Group>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
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
                <FoldersList folders={folders} />
                <VaultsList vaults={vaults} />
              </>
            )}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
};
