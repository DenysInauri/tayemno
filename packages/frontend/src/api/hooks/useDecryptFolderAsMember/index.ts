import type { Folder } from "@tayemno/shared";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import type { ILocalFolder } from "../../../types/local";
import { useGetFolderKeyAsMember } from "../useGetFolderKeyAsMember";

export const useDecryptFolderAsMember = () => {
  const { getFolderKey } = useGetFolderKeyAsMember();

  const decrypt = async (folder: Folder): Promise<ILocalFolder> => {
    try {
      const folderKey = await getFolderKey(folder.id);

      const name = await SymmetricCrypto.decrypt(
        { nonce: folder.nameNonce, ciphertext: folder.encryptedName },
        folderKey,
      );

      return {
        id: folder.id,
        parentFolderId: folder.parentFolderId,
        workspaceId: folder.workspaceId,
        name,
        symmetricKey: folderKey,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      };
    } catch (e) {
      console.error("Failed to decrypt folder", e);
      throw e;
    }
  };

  return { decrypt };
};
