import { useState, useMemo } from "react";
import { MultiSelect } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconPlus } from "@tabler/icons-react";
import type { IFolderMemberItem, IMemberItem } from "@tayemno/shared";
import { Button } from "../../../../../ui/Button";
import { Group } from "../../../../../ui/Group";
import { Stack } from "../../../../../ui/Stack";
import { useGetMembers } from "../../../../../../api/hooks/useGetMembers";
import { SizeEnum } from "../../../../../../enums/ui/SizeEnum";

interface IProps {
  folderMembers: IFolderMemberItem[];
  isSubmitting: boolean;
  onAdd: (members: IMemberItem[]) => void;
  onCancel: () => void;
}

export const AddMemberSelect = ({
  folderMembers,
  isSubmitting,
  onAdd,
  onCancel,
}: IProps) => {
  const { t } = useTranslation();
  const { data: membersResponse } = useGetMembers();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const existingUserIds = useMemo(
    () => new Set(folderMembers.map((m) => m.userId)),
    [folderMembers],
  );

  const options = useMemo(() => {
    if (!membersResponse?.members) return [];
    return membersResponse.members.map((m) => ({
      value: m.userId,
      label: `${m.name} (${m.email})`,
      disabled: existingUserIds.has(m.userId),
    }));
  }, [membersResponse?.members, existingUserIds]);

  const handleSubmit = () => {
    if (!membersResponse?.members) return;
    const selected = membersResponse.members.filter((m) =>
      selectedIds.includes(m.userId),
    );
    onAdd(selected);
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
