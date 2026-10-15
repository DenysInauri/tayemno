import { useState, useEffect } from "react";
import type { IFolderMemberItem } from "@tayemno/shared";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { useGetFolderKeyAsAdmin } from "../useGetFolderKeyAsAdmin";

export interface IDecryptedAncestor {
  folderId: string;
  name: string;
}

export const useDecryptAncestorFolderNames = (
  members: IFolderMemberItem[],
) => {
  const { getFolderKey } = useGetFolderKeyAsAdmin();
  const [ancestorMap, setAncestorMap] = useState<
    Record<string, IDecryptedAncestor>
  >({});

  useEffect(() => {
    const decrypt = async () => {
      const inherited = members.filter(
        (m) =>
          m.inherited &&
          m.ancestorFolderId &&
          m.ancestorEncryptedName &&
          m.ancestorNameNonce,
      );

      if (inherited.length === 0) return;

      const uniqueMap = new Map(
        inherited.map((m) => [m.ancestorFolderId!, m]),
      );

      const entries = await Promise.all(
        [...uniqueMap.entries()].map(async ([ancestorFolderId, sample]) => {
          try {
            const folderKey = await getFolderKey(ancestorFolderId);
            const name = await SymmetricCrypto.decrypt(
              {
                nonce: sample.ancestorNameNonce!,
                ciphertext: sample.ancestorEncryptedName!,
              },
              folderKey,
            );
            return [ancestorFolderId, { folderId: ancestorFolderId, name }] as const;
          } catch {
            return [ancestorFolderId, { folderId: ancestorFolderId, name: "..." }] as const;
          }
        }),
      );

      const folderNames = Object.fromEntries(entries);

      const userMap = Object.fromEntries(
        inherited.map((m) => [m.userId, folderNames[m.ancestorFolderId!]]),
      );

      setAncestorMap(userMap);
    };

    decrypt();
  }, [members, getFolderKey]);

  return { ancestorMap };
};
