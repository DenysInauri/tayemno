import type { IKeyPair, IWorkspaceData } from "@tayemno/shared";
import { AsymmetricCrypto } from "../AsymmetricCrypto";

export const decryptWorkspaceName = async (
  workspace: IWorkspaceData,
  keyPair: IKeyPair,
): Promise<string> => {
  if (!workspace.encryptedMemberPrivateKey) return "";

  const memberPrivateKey = await AsymmetricCrypto.decrypt(
    workspace.encryptedMemberPrivateKey,
    keyPair.publicKey,
    keyPair.privateKey,
  );

  return AsymmetricCrypto.decrypt(
    workspace.encryptedName,
    workspace.memberPublicKey,
    memberPrivateKey,
  );
};
