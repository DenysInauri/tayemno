import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";

import type { ILocalVault } from "../../../../types/local";
import { useDownload } from "../../../../contexts/DownloadContext";
import { Stack } from "../../../ui/Stack";
import { Text } from "../../../ui/Text";
import { Button } from "../../../ui/Button";
import { useTextContent } from "./useTextContent";
import { getHighlightLanguage } from "./getHighlightLanguage";
import classes from "./index.module.css";

interface IProps {
  url: string;
  vault: ILocalVault;
}

const TextViewer = ({ url, vault }: IProps) => {
  const { t } = useTranslation();
  const { download, isDownloading } = useDownload();
  const { content, isLoading, error } = useTextContent(url);

  const language = getHighlightLanguage(vault.extension);

  const highlighted = useMemo(() => {
    if (!content) return "";
    if (language) return hljs.highlight(content, { language }).value;
    return content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }, [content, language]);

  const lineCount = content ? content.split("\n").length : 0;

  if (isLoading) {
    return (
      <Stack align="center" justify="center" className={classes.centered}>
        <Loader />
        <Text c="dimmed">{t("preview.loading")}</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack align="center" justify="center" gap="md" className={classes.centered}>
        <Text c="dimmed">
          {error === "binary"
            ? t("preview.text.binaryError")
            : t("preview.error.description")}
        </Text>
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
      <div className={classes.lineNumbers}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className={classes.lineNumber}>
            {i + 1}
          </div>
        ))}
      </div>
      <pre className={classes.pre}>
        <code
          className={`hljs ${classes.code}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
};

export { TextViewer };
export default TextViewer;
