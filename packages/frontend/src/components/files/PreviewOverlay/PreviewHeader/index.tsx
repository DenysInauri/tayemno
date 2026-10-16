import { useTranslation } from "react-i18next";
import { IconX, IconDownload } from "@tabler/icons-react";

import type { ILocalVault } from "../../../../types/local";
import { useDownload } from "../../../../contexts/DownloadContext";
import { Group } from "../../../ui/Group";
import { Text } from "../../../ui/Text";
import { ActionIcon } from "../../../ui/ActionIcon";
import classes from "./index.module.css";

interface IProps {
  vault: ILocalVault;
  onClose: () => void;
}

export const PreviewHeader = ({ vault, onClose }: IProps) => {
  const { t } = useTranslation();
  const { download, isDownloading } = useDownload();

  return (
    <Group
      justify="space-between"
      px="md"
      py="xs"
      className={classes.container}
    >
      <Text size="sm" fw={500} lineClamp={1} className={classes.title}>
        {vault.name}
      </Text>
      <Group gap="xs">
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => download(vault)}
          loading={isDownloading(vault.id)}
        >
          <IconDownload size={18} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" onClick={onClose}>
          <IconX size={18} />
        </ActionIcon>
      </Group>
    </Group>
  );
};
