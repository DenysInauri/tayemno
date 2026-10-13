import { Select, Text, Group, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type {
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
} from "@mantine/core";

interface IRolePickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const ROLE_VALUES = ["admin", "member", "external_member"] as const;

export const RolePicker = ({ value, onChange, error }: IRolePickerProps) => {
  const { t } = useTranslation();

  const roleOptions: ComboboxItem[] = ROLE_VALUES.map((role) => ({
    value: role,
    label: t(`users.roles.${role}`),
  }));

  const renderOption = ({
    option,
    checked,
  }: ComboboxLikeRenderOptionInput<ComboboxItem>) => {
    const descriptionKey = `users.invite.roleDescriptions.${option.value}`;

    return (
      <Group wrap="nowrap" align="flex-start">
        <Stack gap={2}>
          <Text size="sm" fw={checked ? 600 : 400}>
            {t(`users.roles.${option.value}`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t(descriptionKey)}
          </Text>
        </Stack>
      </Group>
    );
  };

  return (
    <Select
      label={t("users.invite.fields.role.label")}
      data={roleOptions}
      value={value}
      onChange={(val) => val && onChange(val)}
      renderOption={renderOption}
      error={error}
      allowDeselect={false}
    />
  );
};
