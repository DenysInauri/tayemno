import { Vault } from "@tayemno/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import type { ILocalFolder, ILocalVault } from "../../../types/local";

export const useDecryptVault = () => {
  const { workspace, keyPair } = useAuth();

  const decryptVaultData = async (
    vault: Vault,
    symmetricKey: string,
  ): Promise<ILocalVault> => {
    const name = await SymmetricCrypto.decrypt(
      { nonce: vault.nameNonce, ciphertext: vault.encryptedName },
      symmetricKey,
    );

    const metadataJson = await SymmetricCrypto.decrypt(
      {
        nonce: vault.metadataNonce,
        ciphertext: vault.encryptedMetadata,
      },
      symmetricKey,
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
      symmetricKey,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
    };
  };

  const decrypt = async (
    vault: Vault,
    folder: ILocalFolder | null = null,
  ): Promise<ILocalVault> => {
    if (!workspace) throw new Error("Workspace not found");
    if (!keyPair) throw new Error("Key pair not found");

    if (!folder) {
      const memberPrivateKey = await AsymmetricCrypto.decrypt(
        workspace.encryptedMemberPrivateKey,
        keyPair.publicKey,
        keyPair.privateKey,
      );

      const symmetricKey = await AsymmetricCrypto.decrypt(
        vault.encryptedSymmetricKey,
        workspace.memberPublicKey,
        memberPrivateKey,
      );

      return decryptVaultData(vault, symmetricKey);
    }

    const symmetricKey = await SymmetricCrypto.decrypt(
      {
        nonce: vault.symmetricKeyNonce!,
        ciphertext: vault.encryptedSymmetricKey,
      },
      folder.symmetricKey,
    );

    return decryptVaultData(vault, symmetricKey);
  };

  return { decrypt };
};
