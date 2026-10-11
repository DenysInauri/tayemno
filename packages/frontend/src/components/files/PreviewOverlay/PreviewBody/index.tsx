import { useTranslation } from "react-i18next";
import { Loader } from "@mantine/core";

import type { ILocalVault } from "../../../../types/local";
import { getFileCategory } from "../../../../utils/fileCategory";
import { Stack } from "../../../ui/Stack";
import { Text } from "../../../ui/Text";
import { ImageViewer } from "../ImageViewer";
import { UnsupportedPreview } from "../UnsupportedPreview";
import { TooLargePreview } from "../TooLargePreview";

const MAX_PREVIEW_SIZE = 100 * 1024 * 1024;

interface IProps {
  vault: ILocalVault;
  url: string | null;
  isLoading: boolean;
  error: string | null;
}

export const PreviewBody = ({ vault, url, isLoading, error }: IProps) => {
  const { t } = useTranslation();

  if (vault.sizeBytes > MAX_PREVIEW_SIZE) {
    return <TooLargePreview vault={vault} />;
  }

  const category = getFileCategory(vault.extension);

  if (category !== "image") {
    return <UnsupportedPreview vault={vault} />;
  }

  if (isLoading) {
    return (
      <Stack align="center" justify="center" style={{ flex: 1 }}>
        <Loader />
        <Text c="dimmed">{t("preview.loading")}</Text>
      </Stack>
    );
  }

  if (error || !url) {
    return (
      <Stack align="center" justify="center" style={{ flex: 1 }}>
        <Text size="lg" fw={500}>
          {t("preview.error.title")}
        </Text>
        <Text c="dimmed">{t("preview.error.description")}</Text>
      </Stack>
    );
  }

  return <ImageViewer url={url} fileName={vault.name} />;
};
