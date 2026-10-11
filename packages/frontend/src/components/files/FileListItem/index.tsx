import type { ReactNode } from "react";
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
  actions?: ReactNode;
  thumbnailUrl?: string | null;
}

export const FileListItem = ({
  name,
  isFolder,
  sizeBytes,
  updatedAt,
  onClick,
  actions,
  thumbnailUrl,
}: IProps) => (
  <Table.Tr onClick={onClick} style={{ cursor: "pointer" }}>
    <Table.Td style={{ position: "relative" }}>
      <Group gap="sm">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            style={{
              width: 20,
              height: 20,
              borderRadius: 2,
              objectFit: "cover",
            }}
          />
        ) : isFolder ? (
          <IconFolder size={20} />
        ) : (
          <IconFile size={20} />
        )}
        <Text size="sm">{name}</Text>
      </Group>
    </Table.Td>
    <Table.Td visibleFrom="sm">
      <Text c="dimmed" size="sm">
        {sizeBytes ? formatFileSize(sizeBytes) : isFolder ? "--" : ""}
      </Text>
    </Table.Td>
    <Table.Td visibleFrom="sm">
      <Text c="dimmed" size="sm">
        {new Date(updatedAt).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </Table.Td>
    <Table.Td width={40} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      {actions}
    </Table.Td>
  </Table.Tr>
);
