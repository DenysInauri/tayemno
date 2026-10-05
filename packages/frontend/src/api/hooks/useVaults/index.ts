import { useQuery } from "@tanstack/react-query";
import type { IGetVaultsResponse, IGetFolderResponse } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import type { ILocalVault } from "../../../types/local";

export const useVaults = (folderId: string | null) => {
  const { workspace, keyPair, user } = useAuth();

  const query = useQuery<ILocalVault[]>({
    queryKey: [QueryKeyEnum.VAULTS, folderId ?? "root"],
    queryFn: async () => {
      const date1 = Date.now();
      let folderKey: string | null = null;
      let memberPrivateKey: string | null = null;

      if (folderId) {
        const { data } = await axios.get<IGetFolderResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders/${folderId}`,
        );

        folderKey = await AsymmetricCrypto.decrypt(
          data.folder.encryptedSymmetricKey,
          user!.publicKey,
          keyPair!.privateKey,
        );
      } else {
        memberPrivateKey = await AsymmetricCrypto.decrypt(
          workspace!.encryptedMemberPrivateKey,
          user!.publicKey,
          keyPair!.privateKey,
        );
      }

      console.log({ keys: Date.now() - date1 });

      const date2 = Date.now();

      const { data: vaultsData } = await axios.get<IGetVaultsResponse>(
        EndpointEnum.VAULTS,
        {
          params: folderId ? { folderId } : { workspaceId: workspace!.id },
        },
      );

      console.log({ vaults: Date.now() - date2 });
      const date3 = Date.now();

      const vaults: ILocalVault[] = await Promise.all(
        vaultsData.vaults.map(async (vault) => {
          let vaultKey: string;

          if (vault.folderId && vault.symmetricKeyNonce && folderKey) {
            vaultKey = await SymmetricCrypto.decrypt(
              {
                nonce: vault.symmetricKeyNonce,
                ciphertext: vault.encryptedSymmetricKey,
              },
              folderKey,
            );
          } else {
            vaultKey = await AsymmetricCrypto.decrypt(
              vault.encryptedSymmetricKey,
              workspace!.memberPublicKey,
              memberPrivateKey!,
            );
          }

          const name = await SymmetricCrypto.decrypt(
            { nonce: vault.nameNonce, ciphertext: vault.encryptedName },
            vaultKey,
          );

          const metadataJson = await SymmetricCrypto.decrypt(
            {
              nonce: vault.metadataNonce,
              ciphertext: vault.encryptedMetadata,
            },
            vaultKey,
          );
          const metadata = JSON.parse(metadataJson);

          return {
            id: vault.id,
            folderId: vault.folderId,
            workspaceId: vault.workspaceId,
            name,
            extension: metadata.extension,
            mimeType: metadata.mimeType,
            sizeBytes: metadata.sizeBytes,
            encryptedSizeBytes: vault.encryptedSizeBytes,
            s3Key: vault.s3Key,
            contentNonce: vault.contentNonce,
            symmetricKey: vaultKey,
            createdAt: vault.createdAt,
            updatedAt: vault.updatedAt,
          };
        }),
      );

      console.log({ decrypted: Date.now() - date3 });

      return vaults.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
    },
    enabled: !!workspace && !!keyPair && !!user,
  });

  return { ...query, data: query.data ?? [] };
};
