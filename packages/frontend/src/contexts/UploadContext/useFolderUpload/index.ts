import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../AuthContext";
import { usePostPresignVault } from "../../../api/hooks/usePostPresignVault";
import { useGetFolderKeyAsMember } from "../../../api/hooks/useGetFolderKeyAsMember";
import { createThrottledProgress } from "../../../utils/createThrottledProgress";
import { buildFolderTree } from "../../../utils/buildFolderTree";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { processFolder } from "../processFolder";
import type { IUploadState } from "../useUploadState";

export const useFolderUpload = (state: IUploadState) => {
  const { keyPair, workspace, user } = useAuth();
  const queryClient = useQueryClient();
  const presignVault = usePostPresignVault();
  const { getFolderKey } = useGetFolderKeyAsMember();

  return useCallback(
    async (files: FileList, parentFolderId: string | null) => {
      if (!keyPair || !workspace || !user) return;
      if (files.length === 0) return;

      const tree = buildFolderTree(files);
      const totalFiles = files.length;
      const id = crypto.randomUUID();
      const controller = state.registerUpload(id, tree.name);

      let fileIndex = 0;
      const fileProgresses = new Array<number>(totalFiles).fill(0);

      const tp = createThrottledProgress((value: number) => {
        state.updateProgress(id, value);
      });

      const updateAggregateProgress = () => {
        const sum = fileProgresses.reduce((s, p) => s + p, 0);
        tp.set(Math.round(sum / totalFiles));
      };

      try {
        let parentKey: string | null = null;
        if (parentFolderId) {
          parentKey = await getFolderKey(parentFolderId);
        }

        await processFolder(tree, parentFolderId, parentKey, {
          workspaceId: workspace.id,
          adminPublicKey: workspace.adminPublicKey,
          userPublicKey: user.publicKey,
          signal: controller.signal,
          presignMutate: presignVault.mutateAsync,
          nextFileIndex: () => fileIndex++,
          onFileEncryptProgress: (idx, ratio) => {
            fileProgresses[idx] = Math.round(ratio * 50);
            updateAggregateProgress();
          },
          onFileUploadProgress: (idx, ratio) => {
            fileProgresses[idx] = 50 + Math.round(ratio * 50);
            updateAggregateProgress();
          },
          onFileComplete: (idx) => {
            fileProgresses[idx] = 100;
            updateAggregateProgress();
          },
        });

        tp.flush();
        queryClient.invalidateQueries({
          queryKey: [QueryKeyEnum.FOLDERS, workspace.id, parentFolderId],
        });
      } catch (err: any) {
        if (err?.name !== "AbortError") throw err;
      } finally {
        tp.cancel();
        state.cleanupUpload(id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyPair, workspace, user],
  );
};
