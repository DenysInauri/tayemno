import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Table } from "@mantine/core";
import type { Folder, Vault } from "@tayemno/shared";

import { Stack } from "../../components/ui/Stack";
import { Group } from "../../components/ui/Group";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { Text } from "../../components/ui/Text";
import { Anchor } from "../../components/ui/Anchor";
import { EmptyState } from "../../components/files/EmptyState";
import { FoldersList } from "../../components/files/FoldersList";
import { VaultsList } from "../../components/files/VaultsList";
import { AddNewEntity } from "../../components/files/AddNewEntity";
import { RouteEnum } from "../../enums/routing/RouteEnum";
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const HomePage = () => {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const folders: Folder[] = [];
  const vaults: Vault[] = [];
  const isEmpty = folders.length === 0 && vaults.length === 0;

  return (
    <Stack gap={SizeEnum.MD} p={SizeEnum.MD}>
      <Group justify="space-between">
        <Breadcrumbs>
          <Anchor
            size="sm"
            component="button"
            type="button"
            onClick={() => navigate(RouteEnum.HOME)}
          >
            {t("files.breadcrumb.root")}
          </Anchor>
          {folderId && <Text size="sm">...</Text>}
        </Breadcrumbs>
        <AddNewEntity />
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
