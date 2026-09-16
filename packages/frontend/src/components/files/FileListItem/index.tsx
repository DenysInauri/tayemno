import { Table } from "@mantine/core";
import { IconFolder, IconFile } from "@tabler/icons-react";

import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { formatFileSize } from "../../../utils/formatFileSize";

interface IProps {
  name: string;
  isFolder: boolean;
  sizeBytes?: number;
  updatedAt: string;
  onClick: () => void;
}

export const FileListItem = ({
  name,
  isFolder,
  sizeBytes,
  updatedAt,
  onClick,
}: IProps) => (
  <Table.Tr onClick={onClick} style={{ cursor: "pointer" }}>
    <Table.Td>
      <Group gap="sm">
        {isFolder ? <IconFolder size={20} /> : <IconFile size={20} />}
        <Text size="sm">{name}</Text>
      </Group>
    </Table.Td>
    <Table.Td visibleFrom="sm">
      <Text c="dimmed" size="sm">
        {!isFolder && !!sizeBytes ? formatFileSize(sizeBytes) : ""}
      </Text>
    </Table.Td>
    <Table.Td visibleFrom="sm">
      <Text c="dimmed" size="sm">
        {new Date(updatedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </Text>
    </Table.Td>
  </Table.Tr>
);
