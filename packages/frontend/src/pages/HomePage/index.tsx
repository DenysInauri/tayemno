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
import { useGetFolders } from "../../api/hooks/useGetFolders";
import { useGetVaults } from "../../api/hooks/useGetVaults";
import { useAuth } from "../../contexts/AuthContext";
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const HomePage = () => {
  const routeParams = useParams<{ folderId: string }>();
  const { t } = useTranslation();
  const { workspace } = useAuth();

  const folderId = routeParams.folderId ?? null;

  const { data: folders, breadcrumbs } = useGetFolders(folderId);
  const { data: vaults } = useGetVaults(folderId, workspace!.id);
  const isEmpty = folders.length === 0 && vaults.length === 0;

  return (
    <Stack gap={SizeEnum.MD} p={SizeEnum.MD}>
      <Group justify="space-between">
        <FolderBreadcrumbs breadcrumbs={breadcrumbs} />
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
                {t("files.columns.storedSize")}
              </Table.Th>
              <Table.Th visibleFrom="sm">
                {t("files.columns.modified")}
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <FoldersList folders={folders} />
            <VaultsList vaults={vaults} />
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
};
