import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IconSearch, IconPlus } from "@tabler/icons-react";
import {
  AuditActionEnum,
  type IFolderMemberItem,
  type IFolderPermissions,
  type IMemberItem,
  type FolderRole,
} from "@tayemno/shared";
import { TextInput } from "../../../../ui/TextInput";
import { Text } from "../../../../ui/Text";
import { Stack } from "../../../../ui/Stack";
import { Title } from "../../../../ui/Title";
import { Group } from "../../../../ui/Group";
import { ActionIcon } from "../../../../ui/ActionIcon";
import { useGetFolderMembers } from "../../../../../api/hooks/useGetFolderMembers";
import { useDeleteFolderAcl } from "../../../../../api/hooks/useDeleteFolderAcl";
import { usePostBulkFolderAcl } from "../../../../../api/hooks/usePostBulkFolderAcl";
import { usePatchFolderAclRole } from "../../../../../api/hooks/usePatchFolderAclRole";
import { useDecryptAncestorFolderNames } from "../../../../../api/hooks/useDecryptAncestorFolderNames";
import { useAuth } from "../../../../../contexts/AuthContext";
import { useGetFolderKeyAsAdmin } from "../../../../../api/hooks/useGetFolderKeyAsAdmin";
import { usePostAuditLog } from "../../../../../api/hooks/usePostAuditLog";
import { SizeEnum } from "../../../../../enums/ui/SizeEnum";
import { FolderMembersList } from "./FolderMembersList";
import { AddMemberSelect } from "./AddMemberSelect";
import { buildAddMembersPayload } from "./buildAddMembersPayload";
import classes from "./index.module.css";

interface IProps {
  folderId: string;
  permissions: IFolderPermissions;
}

export const FolderMembersSection = ({ folderId, permissions }: IProps) => {
  const { t } = useTranslation();
  const { user, workspace } = useAuth();
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";
  const { data } = useGetFolderMembers(folderId);
  const deleteMutation = useDeleteFolderAcl(folderId);
  const { getFolderKey } = useGetFolderKeyAsAdmin();
  const bulkAddMutation = usePostBulkFolderAcl(folderId);
  const roleMutation = usePatchFolderAclRole(folderId);
  const { logAction } = usePostAuditLog();
  const { ancestorMap } = useDecryptAncestorFolderNames(data?.members ?? []);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    logAction({
      action: AuditActionEnum.FOLDER_ACL_REVOKED,
      folderId,
      memberName: member.name,
      memberEmail: member.email,
    });
  };

  const handleRoleChange = async (member: IFolderMemberItem, role: FolderRole) => {
    await roleMutation.mutateAsync({ userId: member.userId, role });
    logAction({
      action: AuditActionEnum.FOLDER_ACL_ROLE_CHANGED,
      folderId,
      memberName: member.name,
      memberEmail: member.email,
      role,
    });
  };

  const handleAddMembers = async (members: IMemberItem[], role: FolderRole) => {
    setIsSubmitting(true);
    try {
      const folderKey = await getFolderKey(folderId);
      const payload = await buildAddMembersPayload({
        selectedMembers: members,
        folderKey,
        role,
      });
      await bulkAddMutation.mutateAsync(payload);
      members.forEach((member) => {
        logAction({ action: AuditActionEnum.FOLDER_ACL_CREATED, folderId, memberName: member.name, memberEmail: member.email });
      });
      setShowAddMember(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap={SizeEnum.SM} className={classes.container} mt={SizeEnum.SM}>
      <Title order={5}>{t("aside.members.title")}</Title>
      <Text size="sm" c="dimmed">
        {t("aside.members.description")}
      </Text>
      <Group gap={SizeEnum.XS}>
        <TextInput
          placeholder={t("aside.members.search.placeholder")}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          size="sm"
          className={classes.searchInput}
        />
        {permissions.canManageMembers && (
          <ActionIcon
            variant="default"
            size="input-sm"
            onClick={() => setShowAddMember(true)}
          >
            <IconPlus size={16} />
          </ActionIcon>
        )}
      </Group>
      {showAddMember && (
        <AddMemberSelect
          folderMembers={data?.members ?? []}
          isAdmin={isAdmin}
          isSubmitting={isSubmitting}
          onAdd={handleAddMembers}
          onCancel={() => setShowAddMember(false)}
        />
      )}
      <FolderMembersList
        members={filteredMembers}
        currentUserId={user!.id}
        canManageMembers={permissions.canManageMembers}
        isAdmin={isAdmin}
        folderId={folderId}
        ancestorMap={ancestorMap}
        onRevoke={handleRevoke}
        onRoleChange={handleRoleChange}
      />
    </Stack>
  );
};
