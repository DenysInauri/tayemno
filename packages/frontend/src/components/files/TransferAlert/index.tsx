import { Box, Group } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

import { Paper } from "../../ui/Paper";
import { Text } from "../../ui/Text";
import { Progress } from "../../ui/Progress";
import { Stack } from "../../ui/Stack";
import { Button } from "../../ui/Button";
import { ActionIcon } from "../../ui/ActionIcon";
import { SizeEnum } from "../../../enums/ui/SizeEnum";
import classes from "./index.module.css";

export interface ITransferItem {
  id: string;
  fileName: string;
  progress: number;
}

interface IProps {
  title: string;
  items: ITransferItem[];
  onCancel: (id: string) => void;
  onCancelAll: () => void;
  cancelAllLabel: string;
}

export const TransferAlert = ({
  title,
  items,
  onCancel,
  onCancelAll,
  cancelAllLabel,
}: IProps) => (
  <Paper shadow="md" radius="md" className={classes.paper}>
    <Box bg="gray.2" p={SizeEnum.SM}>
      <Text fw={600} size="sm">
        {title}
      </Text>
    </Box>

    <Box
      bg="gray.0"
      p={SizeEnum.SM}
      className={classes.itemList}
    >
      <Stack gap={SizeEnum.SM}>
        {items.map((item) => (
          <Stack key={item.id} gap="xs">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" truncate>
                {item.fileName}
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => onCancel(item.id)}
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
        {cancelAllLabel}
      </Button>
    </Box>
  </Paper>
);
