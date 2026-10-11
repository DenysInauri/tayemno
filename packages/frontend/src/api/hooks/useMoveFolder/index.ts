import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { IMoveFolderRequest, IMoveFolderResponse } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { useGetFolderKeyAsMember } from "../useGetFolderKeyAsMember";
import type { ILocalFolder } from "../../../types/local";

export const useMoveFolder = () => {
  const { keyPair, workspace } = useAuth();
  const queryClient = useQueryClient();
  const { getFolderKey } = useGetFolderKeyAsMember();
  const [isMoving, setIsMoving] = useState(false);

  const move = async (folder: ILocalFolder, targetFolderId: string | null) => {
    if (!keyPair || !workspace) return;

    setIsMoving(true);

    try {
      const folderKey = folder.symmetricKey;

      let wrappedKey: string | null = null;
      let wrappedKeyNonce: string | null = null;

      if (targetFolderId) {
        const targetKey = await getFolderKey(targetFolderId);
        const wrapped = await SymmetricCrypto.encrypt(folderKey, targetKey);
        wrappedKey = wrapped.ciphertext;
        wrappedKeyNonce = wrapped.nonce;
      }

      const encryptedSymmetricKey = await AsymmetricCrypto.encrypt(
        folderKey,
        workspace.adminPublicKey,
      );

      const body: IMoveFolderRequest = {
        newParentFolderId: targetFolderId,
        wrappedKey,
        wrappedKeyNonce,
        encryptedSymmetricKey,
      };

      await axios.patch<IMoveFolderResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace.id}${EndpointEnum.FOLDERS}/${folder.id}/move`,
        body,
      );

      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.FOLDERS, workspace.id, folder.parentFolderId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.FOLDERS, workspace.id, targetFolderId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.FOLDER_TREE, workspace.id],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.BREADCRUMBS, workspace.id],
      });
    } finally {
      setIsMoving(false);
    }
  };

  return { move, isMoving };
};
