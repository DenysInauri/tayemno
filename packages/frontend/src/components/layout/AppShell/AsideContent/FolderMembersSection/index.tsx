import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IconSearch } from "@tabler/icons-react";
import type { IFolderMemberItem } from "@tayemno/shared";
import { TextInput } from "../../../../ui/TextInput";
import { Text } from "../../../../ui/Text";
import { Stack } from "../../../../ui/Stack";
import { Title } from "../../../../ui/Title";
import { useGetFolderMembers } from "../../../../../api/hooks/useGetFolderMembers";
import { useDeleteFolderAcl } from "../../../../../api/hooks/useDeleteFolderAcl";
import { useAuth } from "../../../../../contexts/AuthContext";
import { SizeEnum } from "../../../../../enums/ui/SizeEnum";
import { FolderMembersList } from "./FolderMembersList";

interface IProps {
  folderId: string;
}

export const FolderMembersSection = ({ folderId }: IProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data } = useGetFolderMembers(folderId);
  const deleteMutation = useDeleteFolderAcl(folderId);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    if (!searchQuery) return data.members;
    const q = searchQuery.toLowerCase();
    return data.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [data?.members, searchQuery]);

  const handleRevoke = async (member: IFolderMemberItem) => {
    await deleteMutation.mutateAsync(member.userId);
  };

  return (
    <Stack gap={SizeEnum.SM}>
      <Title order={5}>{t("aside.members.title")}</Title>
      <Text size="sm" c="dimmed">
        {t("aside.members.description")}
      </Text>
      <TextInput
        placeholder={t("aside.members.search.placeholder")}
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        size="sm"
      />
      <FolderMembersList
        members={filteredMembers}
        currentUserId={user!.id}
        onRevoke={handleRevoke}
      />
    </Stack>
  );
};
