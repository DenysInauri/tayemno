import { useTranslation } from "react-i18next";

import { TransferAlert } from "../TransferAlert";
import { Stack } from "../../ui/Stack";
import { useDownload } from "../../../contexts/DownloadContext";
import { useUpload } from "../../../contexts/UploadContext";

export const TransferPanel = () => {
  const { t } = useTranslation();
  const {
    downloads,
    cancel: cancelDownload,
    cancelAll: cancelAllDownloads,
  } = useDownload();
  const {
    uploads,
    cancel: cancelUpload,
    cancelAll: cancelAllUploads,
  } = useUpload();

  if (uploads.length === 0 && downloads.length === 0) return null;

  return (
    <Stack
      gap="sm"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      {uploads.length > 0 && (
        <TransferAlert
          title={t("files.uploadAlert.title")}
          items={uploads}
          onCancel={cancelUpload}
          onCancelAll={cancelAllUploads}
          cancelAllLabel={t("files.uploadAlert.cancelAll")}
        />
      )}
      {downloads.length > 0 && (
        <TransferAlert
          title={t("files.downloadAlert.title")}
          items={downloads}
          onCancel={cancelDownload}
          onCancelAll={cancelAllDownloads}
          cancelAllLabel={t("files.downloadAlert.cancelAll")}
        />
      )}
    </Stack>
  );
};
