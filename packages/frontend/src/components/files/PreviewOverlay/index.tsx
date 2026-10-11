import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { Loader } from "@mantine/core";
import {
  IconX,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

import type { ILocalVault } from "../../../types/local";
import { useDownload } from "../../../contexts/DownloadContext";
import { getFileCategory } from "../../../utils/fileCategory";
import { Modal } from "../../ui/Modal";
import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { Stack } from "../../ui/Stack";
import { ActionIcon } from "../../ui/ActionIcon";
import { useKeyboard } from "../../../hooks/useKeyboard";
import { usePreview } from "./usePreview";
import { ImageViewer } from "./ImageViewer";
import { UnsupportedPreview } from "./UnsupportedPreview";
import { TooLargePreview } from "./TooLargePreview";

const MAX_PREVIEW_SIZE = 100 * 1024 * 1024;

export interface IPreviewOverlayHandle {
  open: (vault: ILocalVault) => void;
  close: () => void;
}

interface IProps {
  vaults: ILocalVault[];
}

export const PreviewOverlay = forwardRef(
  ({ vaults }: IProps, ref: Ref<IPreviewOverlayHandle>) => {
    const { t } = useTranslation();
    const { download, isDownloading } = useDownload();
    const [vault, setVault] = useState<ILocalVault | null>(null);
    const { url, isLoading, error } = usePreview(vault);

    useImperativeHandle(ref, () => ({
      open: (v: ILocalVault) => setVault(v),
      close: () => setVault(null),
    }));

    const currentIndex = vault
      ? vaults.findIndex((v) => v.id === vault.id)
      : -1;

    const handleClose = useCallback(() => setVault(null), []);

    const navigatePrev = useCallback(() => {
      if (vaults.length <= 1 || currentIndex < 0) return;
      const prevIndex =
        currentIndex === 0 ? vaults.length - 1 : currentIndex - 1;
      setVault(vaults[prevIndex]);
    }, [vaults, currentIndex]);

    const navigateNext = useCallback(() => {
      if (vaults.length <= 1 || currentIndex < 0) return;
      const nextIndex =
        currentIndex === vaults.length - 1 ? 0 : currentIndex + 1;
      setVault(vaults[nextIndex]);
    }, [vaults, currentIndex]);

    useKeyboard({ ArrowLeft: navigatePrev, ArrowRight: navigateNext });

    const renderBody = () => {
      if (!vault) return null;

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

    return (
      <Modal
        opened={vault !== null}
        onClose={handleClose}
        fullScreen
        withCloseButton={false}
        padding={0}
        styles={{
          body: {
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {vault && (
          <>
            <Group
              justify="space-between"
              px="md"
              py="xs"
              style={{
                borderBottom: "1px solid var(--mantine-color-default-border)",
              }}
            >
              <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
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
                <ActionIcon variant="subtle" color="gray" onClick={handleClose}>
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Group>

            {renderBody()}

            {vaults.length > 1 && (
              <Group
                justify="center"
                gap="md"
                px="md"
                py="xs"
                style={{
                  borderTop: "1px solid var(--mantine-color-default-border)",
                }}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={navigatePrev}
                >
                  <IconChevronLeft size={18} />
                </ActionIcon>
                <Text size="sm" c="dimmed">
                  {t("preview.counter", {
                    current: currentIndex + 1,
                    total: vaults.length,
                  })}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={navigateNext}
                >
                  <IconChevronRight size={18} />
                </ActionIcon>
              </Group>
            )}
          </>
        )}
      </Modal>
    );
  },
);
