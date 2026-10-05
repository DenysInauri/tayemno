import { useQuery } from "@tanstack/react-query";
import type { IGetFoldersResponse } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import type { ILocalFolder } from "../../../types/local";

export interface IBreadcrumb {
  id: string;
  name: string;
}

interface IFolderPageData {
  folders: ILocalFolder[];
  breadcrumbs: IBreadcrumb[];
}

export const useFolders = (parentFolderId: string | null) => {
  const { workspace, keyPair, user } = useAuth();

  const query = useQuery<IFolderPageData>({
    queryKey: [QueryKeyEnum.FOLDERS, parentFolderId],
    queryFn: async () => {
      const { data } = await axios.get<IGetFoldersResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders`,
        { params: { parentFolderId } },
      );

      const folders: ILocalFolder[] = await Promise.all(
        data.folders.map(async (folder) => {
          const folderKey = await AsymmetricCrypto.decrypt(
            folder.encryptedSymmetricKey,
            user!.publicKey,
            keyPair!.privateKey,
          );

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
        }),
      );

      const breadcrumbs: IBreadcrumb[] = await Promise.all(
        data.breadcrumbs.map(async (crumb) => {
          const key = await AsymmetricCrypto.decrypt(
            crumb.encryptedSymmetricKey,
            user!.publicKey,
            keyPair!.privateKey,
          );

          const name = await SymmetricCrypto.decrypt(
            { nonce: crumb.nameNonce, ciphertext: crumb.encryptedName },
            key,
          );

          return { id: crumb.id, name };
        }),
      );

      return {
        folders: folders.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true }),
        ),
        breadcrumbs,
      };
    },
    enabled: !!workspace && !!keyPair && !!user,
  });

  return {
    ...query,
    data: query.data?.folders ?? [],
    breadcrumbs: query.data?.breadcrumbs ?? [],
  };
};
