import { useTranslation } from "react-i18next";
import { IconFolderOpen } from "@tabler/icons-react";

import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { SizeEnum } from "../../../enums/ui/SizeEnum";
import { RoleWrapper } from "../../routing/RoleWrapper";

export const EmptyState = () => {
  const { t } = useTranslation();

  return (
    <Stack align="center" justify="center" mih="50vh" gap={SizeEnum.MD}>
      <RoleWrapper allowedFor={["owner", "admin", "member"]}>
        <IconFolderOpen size={48} color="var(--mantine-color-dimmed)" />
        <Text c="dimmed">{t("files.empty.title")}</Text>
      </RoleWrapper>
      <RoleWrapper allowedFor={["external_member"]}>
        <Text c="dimmed">{t("files.empty.externalMembers")}</Text>
      </RoleWrapper>
    </Stack>
  );
};
