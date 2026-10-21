import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "../../../../ui/Text";
import { Stack } from "../../../../ui/Stack";
import { Title } from "../../../../ui/Title";
import { Button } from "../../../../ui/Button";
import { useGetAuditLogs } from "../../../../../api/hooks/useGetAuditLogs";
import { SizeEnum } from "../../../../../enums/ui/SizeEnum";
import { AuditLogList } from "./AuditLogList";
import classes from "./index.module.css";

interface IProps {
  folderId: string | null;
  vaultId: string | null;
}

export const AuditLogSection = ({ folderId, vaultId }: IProps) => {
  const { t } = useTranslation();
  const { logs, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useGetAuditLogs({ folderId, vaultId });

  const description = useMemo(() => {
    if (vaultId) return t("aside.activity.descriptionFile");
    if (folderId) return t("aside.activity.description");
    return t("aside.activity.descriptionRoot");
  }, [vaultId, folderId, t]);

  return (
    <Stack gap={SizeEnum.SM} className={classes.container} mt={SizeEnum.SM}>
      <Title order={5}>{t("aside.activity.title")}</Title>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
      {logs.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("aside.activity.empty")}
        </Text>
      ) : (
        <>
          <AuditLogList logs={logs} />
          {hasNextPage && (
            <Button
              variant="subtle"
              size="xs"
              loading={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {t("aside.activity.loadMore")}
            </Button>
          )}
        </>
      )}
    </Stack>
  );
};
