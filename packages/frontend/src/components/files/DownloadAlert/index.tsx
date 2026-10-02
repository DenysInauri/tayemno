import { useTranslation } from "react-i18next";
import { Box, Group } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

import type { IDownloadItem } from "../../../contexts/DownloadContext";
import { Paper } from "../../ui/Paper";
import { Text } from "../../ui/Text";
import { Progress } from "../../ui/Progress";
import { Stack } from "../../ui/Stack";
import { Button } from "../../ui/Button";
import { ActionIcon } from "../../ui/ActionIcon";
import { SizeEnum } from "../../../enums/ui/SizeEnum";

interface IProps {
  downloads: IDownloadItem[];
  onCancel: (vaultId: string) => void;
  onCancelAll: () => void;
}

export const DownloadAlert = ({ downloads, onCancel, onCancelAll }: IProps) => {
  const { t } = useTranslation();

  return (
    <Paper
      shadow="md"
      radius="md"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        width: 320,
        overflow: "hidden",
      }}
    >
      <Box bg="gray.2" p={SizeEnum.SM}>
        <Text fw={600} size="sm">
          {t("files.downloadAlert.title")}
        </Text>
      </Box>

      <Box
        bg="gray.0"
        p={SizeEnum.SM}
        style={{
          borderTop: "1px solid var(--mantine-color-gray-3)",
          borderBottom: "1px solid var(--mantine-color-gray-3)",
        }}
      >
        <Stack gap={SizeEnum.SM}>
          {downloads.map((item) => (
            <Stack key={item.vaultId} gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" truncate>
                  {item.fileName}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => onCancel(item.vaultId)}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Group>
              <Progress value={item.progress} size={8} />
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box bg="gray.2" p={SizeEnum.SM}>
        <Button fullWidth variant="default" onClick={onCancelAll}>
          {t("files.downloadAlert.cancelAll")}
        </Button>
      </Box>
    </Paper>
  );
};
