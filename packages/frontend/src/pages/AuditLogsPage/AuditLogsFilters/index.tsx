import { useTranslation } from "react-i18next";
import { Select, Input } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { AuditActionEnum } from "@tayemno/shared";
import { Group } from "../../../components/ui/Group";
import { Button } from "../../../components/ui/Button";
import { Anchor } from "../../../components/ui/Anchor";

interface IMember {
  userId: string;
  name: string;
  email: string;
}

interface IFilters {
  dateFrom: string | null;
  dateTo: string | null;
  actionType: string | null;
  userId: string | null;
}

interface IProps {
  filters: IFilters;
  onDateFromChange: (value: string | null) => void;
  onDateToChange: (value: string | null) => void;
  onActionTypeChange: (value: string | null) => void;
  onUserIdChange: (value: string | null) => void;
  onReset: () => void;
  onExport: () => void;
  isExporting: boolean;
  hasActiveFilters: boolean;
  members: IMember[];
}

const actionOptions = Object.values(AuditActionEnum).map((value) => ({
  value,
  label: value,
}));

export const AuditLogsFilters = ({
  filters,
  onDateFromChange,
  onDateToChange,
  onActionTypeChange,
  onUserIdChange,
  onReset,
  onExport,
  isExporting,
  hasActiveFilters,
  members,
}: IProps) => {
  const { t } = useTranslation();

  const memberOptions = members.map((m) => ({
    value: m.userId,
    label: `${m.name} (${m.email})`,
  }));

  return (
    <Group>
      <Input.Wrapper label={t("auditLogs.filters.dateFrom")}>
        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => onDateFromChange(e.currentTarget.value || null)}
        />
      </Input.Wrapper>
      <Input.Wrapper label={t("auditLogs.filters.dateTo")}>
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => onDateToChange(e.currentTarget.value || null)}
        />
      </Input.Wrapper>
      <Select
        label={t("auditLogs.filters.actionType")}
        placeholder={t("auditLogs.filters.allActions")}
        data={actionOptions}
        value={filters.actionType}
        onChange={onActionTypeChange}
        clearable
        searchable
        w={220}
      />
      <Select
        label={t("auditLogs.filters.actor")}
        placeholder={t("auditLogs.filters.allActors")}
        data={memberOptions}
        value={filters.userId}
        onChange={onUserIdChange}
        clearable
        searchable
        w={220}
      />
      {hasActiveFilters && (
        <Anchor component="button" size="sm" onClick={onReset} mt={24}>
          {t("auditLogs.filters.reset")}
        </Anchor>
      )}
      <Button
        variant="light"
        leftSection={<IconDownload size={16} />}
        onClick={onExport}
        loading={isExporting}
        ml="auto"
        mt={24}
      >
        {isExporting ? t("auditLogs.export.loading") : t("auditLogs.export.button")}
      </Button>
    </Group>
  );
};
