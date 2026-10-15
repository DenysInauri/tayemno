import type { IBulkCreateFolderAclRequest, IMemberItem } from "@tayemno/shared";
import { AsymmetricCrypto } from "../../../../../../utils/crypto/AsymmetricCrypto";

interface IParams {
  selectedMembers: IMemberItem[];
  folderKey: string;
}

export const buildAddMembersPayload = async ({
  selectedMembers,
  folderKey,
}: IParams): Promise<IBulkCreateFolderAclRequest> => {
  const acls = await Promise.all(
    selectedMembers.map(async (member) => ({
      userId: member.userId,
      encryptedFolderKey: await AsymmetricCrypto.encrypt(
        folderKey,
        member.publicKey,
      ),
    })),
  );

  return { acls };
};
