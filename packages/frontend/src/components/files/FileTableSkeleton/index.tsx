import { useTranslation } from "react-i18next";
import { Table } from "@mantine/core";

import { Skeleton } from "../../ui/Skeleton";

const SKELETON_ROWS = 5;

export const FileTableSkeleton = () => {
  const { t } = useTranslation();

  return (
    <Table>
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
          <Table.Th w={40} />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <Table.Tr key={i}>
            <Table.Td>
              <Skeleton height={20} width="60%" radius="sm" />
            </Table.Td>
            <Table.Td visibleFrom="sm">
              <Skeleton height={20} width={80} radius="sm" />
            </Table.Td>
            <Table.Td visibleFrom="sm">
              <Skeleton height={20} width={80} radius="sm" />
            </Table.Td>
            <Table.Td visibleFrom="sm">
              <Skeleton height={20} width={100} radius="sm" />
            </Table.Td>
            <Table.Td w={40} />
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};
