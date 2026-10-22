import { useTranslation } from "react-i18next";
import { Title } from "../../components/ui/Title";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Stack } from "../../components/ui/Stack";
import { useGetAuditLogs } from "../../api/hooks/useGetAuditLogs";
import { useGetMembers } from "../../api/hooks/useGetMembers";
import { useAuditLogsFilters } from "./useAuditLogsFilters";
import { useExportCsv } from "./useExportCsv";
import { AuditLogsFilters } from "./AuditLogsFilters";
import { AuditLogsTable } from "./AuditLogsTable";

export const AuditLogsPage = () => {
  const { t } = useTranslation();
  const {
    filters,
    setDateFrom,
    setDateTo,
    setActionType,
    setUserId,
    resetFilters,
    hasActiveFilters,
  } = useAuditLogsFilters();

  const { logs, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useGetAuditLogs(filters);
  const { data: membersResponse } = useGetMembers();
  const { exportCsv, isExporting } = useExportCsv();

  const members = membersResponse?.members ?? [];

  const emptyKey = hasActiveFilters
    ? "auditLogs.empty.noResults"
    : "auditLogs.empty.noLogs";

  return (
    <Stack p="lg">
      <Title order={2}>{t("auditLogs.title")}</Title>
      <AuditLogsFilters
        filters={filters}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onActionTypeChange={setActionType}
        onUserIdChange={setUserId}
        onReset={resetFilters}
        onExport={() => exportCsv(filters)}
        isExporting={isExporting}
        hasActiveFilters={hasActiveFilters}
        members={members}
      />
      {logs.length === 0 ? (
        <Text c="dimmed">{t(emptyKey)}</Text>
      ) : (
        <>
          <AuditLogsTable logs={logs} />
          {hasNextPage && (
            <Button
              variant="subtle"
              onClick={() => fetchNextPage()}
              loading={isFetchingNextPage}
            >
              {t("aside.activity.loadMore")}
            </Button>
          )}
        </>
      )}
    </Stack>
  );
};
