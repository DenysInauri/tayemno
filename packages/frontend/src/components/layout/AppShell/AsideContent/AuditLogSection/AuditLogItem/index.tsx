import { useTranslation } from "react-i18next";
import type { IDecryptedAuditLog } from "../../../../../../api/hooks/useGetAuditLogs";
import { formatAuditContext } from "../../../../../../utils/formatAuditContext";
import { Text } from "../../../../../ui/Text";
import { Stack } from "../../../../../ui/Stack";
import { Group } from "../../../../../ui/Group";
import classes from "./index.module.css";

interface IProps {
  log: IDecryptedAuditLog;
}

export const AuditLogItem = ({ log }: IProps) => {
  const { t } = useTranslation();

  const contextText = formatAuditContext(log.payload.context);
  const timestamp = new Date(log.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Stack gap={2} className={classes.item}>
      <Text size="sm" fw={500}>
        {t(`aside.activity.actions.${log.payload.action}`)}
      </Text>
      {contextText && (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {contextText}
        </Text>
      )}
      <Group gap="xs">
        <Text size="xs" c="dimmed">
          {log.payload.actorName}
        </Text>
        <Text size="xs" c="dimmed">
          {timestamp}
        </Text>
        {log.ipAddress && (
          <Text size="xs" c="dimmed">
            {log.ipAddress}
          </Text>
        )}
      </Group>
    </Stack>
  );
};
