import { useQuery } from "@tanstack/react-query";
import type {
  IGetFolderTreeResponse,
  IFolderTreeNode as IEncryptedFolderTreeNode,
} from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";

export interface IFolderTreeNode {
  id: string;
  name: string;
  children: IFolderTreeNode[];
}

const sortNodes = (nodes: IFolderTreeNode[]) => {
  nodes.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  nodes.forEach((n) => sortNodes(n.children));
};

export const useLocalFolderTree = (enabled: boolean) => {
  const { workspace, keyPair, user } = useAuth();

  const query = useQuery<IFolderTreeNode[]>({
    queryKey: [QueryKeyEnum.FOLDER_TREE],
    queryFn: async () => {
      const { data } = await axios.get<IGetFolderTreeResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders/tree`,
      );

      const decryptNode = async (
        node: IEncryptedFolderTreeNode,
      ): Promise<IFolderTreeNode> => {
        const key = await AsymmetricCrypto.decrypt(
          node.encryptedSymmetricKey,
          user!.publicKey,
          keyPair!.privateKey,
        );

        const name = await SymmetricCrypto.decrypt(
          { nonce: node.nameNonce, ciphertext: node.encryptedName },
          key,
        );

        const children = await Promise.all(node.children.map(decryptNode));

        return { id: node.id, name, children };
      };

      const roots = await Promise.all(data.folders.map(decryptNode));
      sortNodes(roots);
      return roots;
    },
    enabled: enabled && !!workspace && !!keyPair && !!user,
  });

  return { ...query, data: query.data ?? [] };
};
