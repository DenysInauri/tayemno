import { useState, useMemo } from "react";
import { MultiSelect, NativeSelect } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconPlus } from "@tabler/icons-react";
import type { IFolderMemberItem, IMemberItem, FolderRole } from "@tayemno/shared";
import { Button } from "../../../../../ui/Button";
import { Group } from "../../../../../ui/Group";
import { Stack } from "../../../../../ui/Stack";
import { useGetMembers } from "../../../../../../api/hooks/useGetMembers";
import { SizeEnum } from "../../../../../../enums/ui/SizeEnum";

interface IProps {
  folderMembers: IFolderMemberItem[];
  isAdmin: boolean;
  isSubmitting: boolean;
  onAdd: (members: IMemberItem[], role: FolderRole) => void;
  onCancel: () => void;
}

export const AddMemberSelect = ({
  folderMembers,
  isAdmin,
  isSubmitting,
  onAdd,
  onCancel,
}: IProps) => {
  const { t } = useTranslation();
  const { data: membersResponse } = useGetMembers();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<FolderRole>("viewer");

  const existingUserIds = useMemo(
    () => new Set(folderMembers.map((m) => m.userId)),
    [folderMembers],
  );

  const options = useMemo(() => {
    if (!membersResponse?.members) return [];
    return membersResponse.members
      .filter((m) => m.role !== "owner" && m.role !== "admin")
      .map((m) => ({
        value: m.userId,
        label: `${m.name} (${m.email})`,
        disabled: existingUserIds.has(m.userId),
      }));
  }, [membersResponse?.members, existingUserIds]);

  const roleOptions = [
    { value: "viewer", label: t("files.roles.viewer") },
    { value: "editor", label: t("files.roles.editor") },
    ...(isAdmin ? [{ value: "manager", label: t("files.roles.manager") }] : []),
  ];

  const handleSubmit = () => {
    if (!membersResponse?.members) return;
    const selected = membersResponse.members.filter((m) =>
      selectedIds.includes(m.userId),
    );
    onAdd(selected, selectedRole);
  };

  return (
    <Stack gap={SizeEnum.SM}>
      <MultiSelect
        data={options}
        value={selectedIds}
        onChange={setSelectedIds}
        placeholder={t("aside.members.add.placeholder")}
        searchable
        size="sm"
      />
      <Group gap={SizeEnum.SM} justify="flex-end">
        <NativeSelect
          size="sm"
          data={roleOptions}
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.currentTarget.value as FolderRole)}
        />
        <Button variant="default" size="sm" onClick={onCancel}>
          {t("aside.members.add.cancel")}
        </Button>
        <Button
          size="sm"
          leftSection={<IconPlus size={14} />}
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={selectedIds.length === 0}
        >
          {t("aside.members.add.submit")}
        </Button>
      </Group>
    </Stack>
  );
};
