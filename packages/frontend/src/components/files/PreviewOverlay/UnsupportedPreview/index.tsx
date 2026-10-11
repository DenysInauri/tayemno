import { useTranslation } from "react-i18next";
import { IconDownload } from "@tabler/icons-react";

import type { ILocalVault } from "../../../../types/local";
import { useDownload } from "../../../../contexts/DownloadContext";
import { Stack } from "../../../ui/Stack";
import { Text } from "../../../ui/Text";
import { Button } from "../../../ui/Button";

interface IProps {
  vault: ILocalVault;
}

export const UnsupportedPreview = ({ vault }: IProps) => {
  const { t } = useTranslation();
  const { download, isDownloading } = useDownload();

  return (
    <Stack align="center" justify="center" gap="md" style={{ flex: 1 }}>
      <Text size="lg" fw={500}>
        {t("preview.unsupported.title")}
      </Text>
      <Text c="dimmed">{t("preview.unsupported.description")}</Text>
      <Button
        leftSection={<IconDownload size={16} />}
        onClick={() => download(vault)}
        loading={isDownloading(vault.id)}
      >
        {t("preview.download")}
      </Button>
    </Stack>
  );
};
