import { useCallback } from "react";
import { zipSync } from "fflate";
import { AuditActionEnum } from "@tayemno/shared";
import type { ILocalFolder } from "../../../types/local";
import { useAuth } from "../../AuthContext";
import { usePostAuditLog } from "../../../api/hooks/usePostAuditLog";
import { useDecryptFolderAsMember } from "../../../api/hooks/useDecryptFolderAsMember";
import { useDecryptVaultAsMember } from "../../../api/hooks/useDecryptVaultAsMember";
import { createThrottledProgress } from "../../../utils/createThrottledProgress";
import { downloadBlob } from "../../../utils/downloadBlob";
import { fetchFolderTree, countFiles } from "../fetchFolderTree";
import { zipEmptyTree } from "../zipEmptyTree";
import { processFolderNode } from "../processFolderNode";
import type { IDownloadState } from "../useDownloadState";

export const useFolderDownload = (state: IDownloadState) => {
  const { workspace } = useAuth();
  const { logAction } = usePostAuditLog();
  const { decrypt: decryptFolder } = useDecryptFolderAsMember();
  const { decrypt: decryptVault } = useDecryptVaultAsMember();

  return useCallback(
    async (folder: ILocalFolder) => {
      const id = folder.id;

      if (state.isDownloadActive(id) || !workspace) return;

      const controller = state.registerDownload(id, folder.name);

      const tp = createThrottledProgress((value: number) => {
        state.updateProgress(id, value);
      });

      try {
        const tree = await fetchFolderTree({
          rootFolder: folder,
          workspaceId: workspace.id,
          signal: controller.signal,
          decryptFolder,
          decryptVault,
        });

        const totalFiles = countFiles(tree);

        if (totalFiles === 0) {
          const blob = zipEmptyTree(tree, folder.name);
          downloadBlob(blob, `${folder.name}.zip`, "application/zip");
          logAction({ action: AuditActionEnum.FOLDER_DOWNLOADED, folder });
          tp.flush();
          return;
        }

        let fileIndex = 0;
        const fileProgresses = new Array<number>(totalFiles).fill(0);
        const zipEntries: Record<string, Uint8Array> = {};

        const updateAggregateProgress = () => {
          const sum = fileProgresses.reduce((s, p) => s + p, 0);
          tp.set(Math.round(sum / totalFiles));
        };

        await processFolderNode(tree, "", {
          workspaceId: workspace.id,
          signal: controller.signal,
          zipEntries,
          nextFileIndex: () => fileIndex++,
          onFetchProgress: (idx, ratio) => {
            fileProgresses[idx] = Math.round(ratio * 50);
            updateAggregateProgress();
          },
          onDecryptProgress: (idx, ratio) => {
            fileProgresses[idx] = 50 + Math.round(ratio * 50);
            updateAggregateProgress();
          },
          onFileComplete: (idx) => {
            fileProgresses[idx] = 100;
            updateAggregateProgress();
          },
        });

        tp.flush();

        const zipped = zipSync(zipEntries);
        const blob = new Blob([zipped], { type: "application/zip" });
        downloadBlob(blob, `${folder.name}.zip`, "application/zip");
        logAction({ action: AuditActionEnum.FOLDER_DOWNLOADED, folder });
      } catch (err: any) {
        if (err?.name !== "AbortError") throw err;
      } finally {
        tp.cancel();
        state.cleanupDownload(id);
      }
    },
    [workspace],
  );
};
