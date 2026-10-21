import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../AuthContext";
import { usePostPresignVault } from "../../../api/hooks/usePostPresignVault";
import { usePostCreateVault } from "../../../api/hooks/usePostCreateVault";
import { useGetFolderKeyAsMember } from "../../../api/hooks/useGetFolderKeyAsMember";
import { createThrottledProgress } from "../../../utils/createThrottledProgress";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { encryptAndUploadVault } from "../encryptAndUploadVault";
import { AuditActionEnum } from "@tayemno/shared";
import { buildVaultEncryptionKey } from "../buildVaultEncryptionKey";
import { usePostAuditLog } from "../../../api/hooks/usePostAuditLog";
import type { IUploadState } from "../useUploadState";

export const useFileUpload = (state: IUploadState) => {
  const { keyPair, workspace, user } = useAuth();
  const queryClient = useQueryClient();
  const presignVault = usePostPresignVault();
  const createVault = usePostCreateVault();
  const { getFolderKey } = useGetFolderKeyAsMember();
  const { logAction } = usePostAuditLog();

  return useCallback(
    async (file: File, folderId: string | null) => {
      if (!keyPair || !workspace || !user) return;

      const id = crypto.randomUUID();
      const controller = state.registerUpload(id, file.name);

      const tp = createThrottledProgress((value: number) => {
        state.updateProgress(id, value);
      });

      try {
        const encryptionKeyResult = await buildVaultEncryptionKey({
          folderId,
          adminPublicKey: workspace.adminPublicKey,
          memberPublicKey: workspace.memberPublicKey,
          getFolderKey,
        });

        const vaultData = await encryptAndUploadVault({
          file,
          vaultKey: encryptionKeyResult.symmetricKey,
          workspaceId: workspace.id,
          folderId,
          signal: controller.signal,
          presignMutate: presignVault.mutateAsync,
          onEncryptProgress: (ratio) => tp.set(Math.round(ratio * 50)),
          onUploadProgress: (ratio) => tp.set(50 + Math.round(ratio * 50)),
        });

        tp.flush();

        const created = await createVault.mutateAsync({
          workspaceId: workspace.id,
          folderId,
          ...vaultData,
          encryptedSymmetricKey: encryptionKeyResult.encryptedSymmetricKey,
          symmetricKeyNonce: encryptionKeyResult.symmetricKeyNonce,
          adminEncryptedSymmetricKey:
            encryptionKeyResult.adminEncryptedSymmetricKey,
        });

        logAction({ action: AuditActionEnum.VAULT_CREATED, folderId: folderId ?? null, vaultId: created.vault.id, vaultName: file.name });

        queryClient.invalidateQueries({
          queryKey: [QueryKeyEnum.VAULTS, workspace.id, folderId],
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
