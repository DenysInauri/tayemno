import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader } from "@mantine/core";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";

import type { ILocalVault } from "../../../../types/local";
import { useDownload } from "../../../../contexts/DownloadContext";
import { Stack } from "../../../ui/Stack";
import { Text } from "../../../ui/Text";
import { Button } from "../../../ui/Button";
import { Group } from "../../../ui/Group";
import { ActionIcon } from "../../../ui/ActionIcon";
import classes from "./index.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

interface IProps {
  url: string;
  vault: ILocalVault;
}

const PdfViewer = ({ url, vault }: IProps) => {
  const { t } = useTranslation();
  const { download, isDownloading } = useDownload();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loadError, setLoadError] = useState(false);

  if (loadError) {
    return (
      <Stack align="center" justify="center" gap="md" className={classes.container}>
        <Text c="dimmed">{t("preview.pdf.error")}</Text>
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
      <Group justify="center" gap="md" className={classes.controls}>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
          disabled={scale <= MIN_SCALE}
        >
          <IconZoomOut size={18} />
        </ActionIcon>
        <Text size="sm">{Math.round(scale * 100)}%</Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
          disabled={scale >= MAX_SCALE}
        >
          <IconZoomIn size={18} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
        <Text size="sm">
          {t("preview.pdf.pageCounter", { current: pageNumber, total: numPages })}
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      </Group>
      <div className={classes.documentWrapper}>
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setLoadError(true)}
          loading={<Loader />}
        >
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  );
};

export { PdfViewer };
export default PdfViewer;
