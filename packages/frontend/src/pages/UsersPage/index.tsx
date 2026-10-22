import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { AuditActionEnum, type IMemberItem } from "@tayemno/shared";
import { Title } from "../../components/ui/Title";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { Group } from "../../components/ui/Group";
import { Stack } from "../../components/ui/Stack";
import { useAuth } from "../../contexts/AuthContext";
import { useGetMembers } from "../../api/hooks/useGetMembers";
import { usePostReinviteMember } from "../../api/hooks/usePostReinviteMember";
import { useDeleteMembers } from "../../api/hooks/useDeleteMember";
import { usePostAuditLog } from "../../api/hooks/usePostAuditLog";
import { generateTempPassword } from "../../utils/generateTempPassword";
import { UsersTable } from "./UsersTable";
import { InviteUserModal } from "./InviteUserModal";
import { DeleteMemberModal } from "./DeleteMemberModal";
import { buildReinvitePayload } from "./buildReinvitePayload";

export const UsersPage = () => {
  const { t } = useTranslation();
  const { user, workspace, keyPair, workspaceName } = useAuth();
  const { data: membersResponse } = useGetMembers();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [reinvitingId, setReinvitingId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<IMemberItem | null>(null);

  const reinviteMutation = usePostReinviteMember(reinvitingId ?? "");
  const { mutateAsync: deleteMembers, isPending: isDeleting } = useDeleteMembers();
  const { logAction } = usePostAuditLog();

  const filteredMembers = useMemo(() => {
    if (!membersResponse?.members) return [];
    if (!searchQuery) return membersResponse.members;
    const q = searchQuery.toLowerCase();
    return membersResponse.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [membersResponse?.members, searchQuery]);

  const handleReinvite = async (member: IMemberItem) => {
    if (!member.adminEncryptedUserPrivateKey || !keyPair || !workspace) return;
    setReinvitingId(member.id);

    try {
      const payload = await buildReinvitePayload({
        email: member.email,
        tempPassword: generateTempPassword(),
        workspaceName: workspaceName ?? "",
        adminEncryptedUserPrivateKey: member.adminEncryptedUserPrivateKey,
        adminKeyPair: keyPair,
        workspace,
      });

      await reinviteMutation.mutateAsync(payload);
    } finally {
      setReinvitingId(null);
    }
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    const { name, email } = memberToDelete;
    await deleteMembers({ memberIds: [memberToDelete.id] });
    logAction({
      action: AuditActionEnum.MEMBER_REMOVED,
      memberName: name,
      memberEmail: email,
    });
    setMemberToDelete(null);
  };

  return (
    <Stack p="lg">
      <Group justify="space-between">
        <Title order={2}>{t("users.title")}</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setInviteModalOpen(true)}
        >
          {t("users.inviteButton")}
        </Button>
      </Group>
      <TextInput
        placeholder={t("users.search.placeholder")}
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
      />
      <UsersTable
        members={filteredMembers}
        currentUserId={user!.id}
        onReinvite={handleReinvite}
        onDelete={setMemberToDelete}
      />
      <InviteUserModal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        workspaceName={workspaceName ?? ""}
      />
      <DeleteMemberModal
        opened={!!memberToDelete}
        member={memberToDelete}
        isDeleting={isDeleting}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDelete}
      />
    </Stack>
  );
};
