import { useCallback } from "react";
import type { ILocalVault } from "../../../types/local";
import { useAuth } from "../../AuthContext";
import { createThrottledProgress } from "../../../utils/createThrottledProgress";
import { downloadBlob } from "../../../utils/downloadBlob";
import { downloadAndDecryptVault } from "../downloadAndDecryptVault";
import type { IDownloadState } from "../useDownloadState";

export const useFileDownload = (state: IDownloadState) => {
  const { workspace } = useAuth();

  return useCallback(
    async (vault: ILocalVault) => {
      const vaultId = vault.id;

      if (state.isDownloadActive(vaultId) || !workspace) return;

      const controller = state.registerDownload(vaultId, vault.name);

      const tp = createThrottledProgress((value: number) => {
        state.updateProgress(vaultId, value);
      });

      try {
        const decryptedBlob = await downloadAndDecryptVault({
          vault,
          workspaceId: workspace.id,
          signal: controller.signal,
          onFetchProgress: (ratio) => tp.set(Math.round(ratio * 50)),
          onDecryptProgress: (ratio) => tp.set(50 + Math.round(ratio * 50)),
        });

        tp.flush();

        downloadBlob(decryptedBlob, vault.name, vault.mimeType);
      } catch (err: any) {
        if (err?.name !== "AbortError") throw err;
      } finally {
        tp.cancel();
        state.cleanupDownload(vaultId);
      }
    },
    [workspace],
  );
};
