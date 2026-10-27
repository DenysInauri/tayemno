import type { IBulkCreateFolderAclRequest, IMemberItem, FolderRole } from "@tayemno/shared";
import { AsymmetricCrypto } from "../../../../../../utils/crypto/AsymmetricCrypto";

interface IParams {
  selectedMembers: IMemberItem[];
  folderKey: string;
  role: FolderRole;
}

export const buildAddMembersPayload = async ({
  selectedMembers,
  folderKey,
  role,
}: IParams): Promise<IBulkCreateFolderAclRequest> => {
  const acls = await Promise.all(
    selectedMembers.map(async (member) => ({
      userId: member.userId,
      encryptedFolderKey: await AsymmetricCrypto.encrypt(
        folderKey,
        member.publicKey,
      ),
      role,
    })),
  );

  return { acls };
};
