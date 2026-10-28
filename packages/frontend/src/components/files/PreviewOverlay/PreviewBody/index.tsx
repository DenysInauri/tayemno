import { useTranslation } from "react-i18next";
import { Loader } from "@mantine/core";

import type { ILocalVault } from "../../../../types/local";
import { FileCategoryEnum } from "../../../../enums/files/FileCategoryEnum";
import { getFileCategory } from "../../../../utils/fileCategory";
import { Stack } from "../../../ui/Stack";
import { Text } from "../../../ui/Text";
import { ImageViewer } from "../ImageViewer";
import { VideoPlayer } from "../VideoPlayer";
import { AudioPlayer } from "../AudioPlayer";
import { UnsupportedPreview } from "../UnsupportedPreview";
import { TooLargePreview } from "../TooLargePreview";
import classes from "./index.module.css";

const MAX_PREVIEW_SIZE = 100 * 1024 * 1024;
const MAX_TEXT_PREVIEW_SIZE = 1024 * 1024;

interface IProps {
  vault: ILocalVault;
  url: string | null;
  isLoading: boolean;
  error: string | null;
}

export const PreviewBody = ({ vault, url, isLoading, error }: IProps) => {
  const { t } = useTranslation();

  const category = getFileCategory(vault.extension);
  const sizeLimit =
    category === FileCategoryEnum.TEXT
      ? MAX_TEXT_PREVIEW_SIZE
      : MAX_PREVIEW_SIZE;

  if (vault.sizeBytes > sizeLimit) {
    return <TooLargePreview vault={vault} />;
  }

  if (
    category === FileCategoryEnum.OTHER ||
    category === FileCategoryEnum.PDF ||
    category === FileCategoryEnum.TEXT
  ) {
    return <UnsupportedPreview vault={vault} />;
  }

  if (isLoading) {
    return (
      <Stack align="center" justify="center" className={classes.centered}>
        <Loader />
        <Text c="dimmed">{t("preview.loading")}</Text>
      </Stack>
    );
  }

  if (error || !url) {
    return (
      <Stack align="center" justify="center" className={classes.centered}>
        <Text size="lg" fw={500}>
          {t("preview.error.title")}
        </Text>
        <Text c="dimmed">{t("preview.error.description")}</Text>
      </Stack>
    );
  }

  switch (category) {
    case FileCategoryEnum.VIDEO:
      return <VideoPlayer url={url} vault={vault} />;
    case FileCategoryEnum.AUDIO:
      return <AudioPlayer url={url} vault={vault} />;
    case FileCategoryEnum.IMAGE:
    default:
      return <ImageViewer url={url} fileName={vault.name} />;
  }
};
