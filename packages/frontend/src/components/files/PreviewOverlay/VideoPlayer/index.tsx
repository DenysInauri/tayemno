import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconDownload } from "@tabler/icons-react";

import type { ILocalVault } from "../../../../types/local";
import { useDownload } from "../../../../contexts/DownloadContext";
import { Stack } from "../../../ui/Stack";
import { Text } from "../../../ui/Text";
import { Button } from "../../../ui/Button";
import classes from "./index.module.css";

interface IProps {
  url: string;
  vault: ILocalVault;
}

export const VideoPlayer = ({ url, vault }: IProps) => {
  const { t } = useTranslation();
  const { download, isDownloading } = useDownload();
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <Stack align="center" justify="center" gap="md" className={classes.container}>
        <Text c="dimmed">{t("preview.video.unsupported")}</Text>
        <Button
          leftSection={<IconDownload size={16} />}
          onClick={() => download(vault)}
          loading={isDownloading(vault.id)}
        >
          {t("preview.download")}
        </Button>
      </Stack>
    );
  }

  return (
    <div className={classes.container}>
      <video
        src={url}
        controls
        className={classes.video}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
