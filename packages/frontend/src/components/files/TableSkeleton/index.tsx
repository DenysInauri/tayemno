import { Table } from "@mantine/core";

import { Group } from "../../ui/Group";
import { Skeleton } from "../../ui/Skeleton";

const SKELETON_ROWS = 5;

export const TableSkeleton = () => (
  <>
    {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
      <Table.Tr key={i}>
        <Table.Td>
          <Group gap="sm">
            <Skeleton height={20} width={20} />
            <Skeleton height={14} width={`${50 + Math.random() * 30}%`} />
          </Group>
        </Table.Td>
        <Table.Td visibleFrom="sm">
          <Skeleton height={14} width={60} />
        </Table.Td>
        <Table.Td visibleFrom="sm">
          <Skeleton height={14} width={90} />
        </Table.Td>
        <Table.Td width={40} />
      </Table.Tr>
    ))}
  </>
);
