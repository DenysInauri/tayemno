import type { ReactNode } from "react";
import { Table } from "@mantine/core";
import { IconFolder, IconFile, IconX } from "@tabler/icons-react";

import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { Progress } from "../../ui/Progress";
import { ActionIcon } from "../../ui/ActionIcon";
import { formatFileSize } from "../../../utils/formatFileSize";

interface IProps {
  name: string;
  isFolder: boolean;
  sizeBytes?: number;
  encryptedSizeBytes?: number;
  updatedAt: string;
  onClick: () => void;
  actions?: ReactNode;
  progress?: number;
  onCancelProgress?: () => void;
}

export const FileListItem = ({
  name,
  isFolder,
  sizeBytes,
  encryptedSizeBytes,
  updatedAt,
  onClick,
  actions,
  progress,
  onCancelProgress,
}: IProps) => (
  <Table.Tr onClick={onClick} style={{ cursor: "pointer" }}>
    <Table.Td style={{ position: "relative" }}>
      <Group gap="sm">
        {isFolder ? <IconFolder size={20} /> : <IconFile size={20} />}
        <Text size="sm">{name}</Text>
      </Group>
      {progress !== undefined && progress > 0 && (
        <Group
          gap={4}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          wrap="nowrap"
        >
          <Progress value={progress} size={8} style={{ flex: 1 }} />
          {!!onCancelProgress && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size={16}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onCancelProgress();
              }}
            >
              <IconX size={12} />
            </ActionIcon>
          )}
        </Group>
      )}
    </Table.Td>
    <Table.Td visibleFrom="sm">
      <Text c="dimmed" size="sm">
        {!!sizeBytes ? formatFileSize(sizeBytes) : ""}
      </Text>
    </Table.Td>
    <Table.Td visibleFrom="sm">
      <Text c="dimmed" size="sm">
        {!!encryptedSizeBytes ? formatFileSize(encryptedSizeBytes) : ""}
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
    <Table.Td width={40} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      {actions}
    </Table.Td>
  </Table.Tr>
);
