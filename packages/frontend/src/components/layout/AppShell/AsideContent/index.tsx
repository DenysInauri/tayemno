import { AppShell as MantineAppShell } from "@mantine/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Title } from "../../../ui/Title";
import { Text } from "../../../ui/Text";
import { Stack } from "../../../ui/Stack";
import { SizeEnum } from "../../../../enums/ui/SizeEnum";
import { FolderMembersSection } from "./FolderMembersSection";

export const AsideContent = () => {
  const { t } = useTranslation();
  const { folderId } = useParams<{ folderId: string }>();

  return (
    <MantineAppShell.Aside p={SizeEnum.MD}>
      <MantineAppShell.Section>
        <Stack gap={SizeEnum.MD}>
          <Title order={4}>{t("aside.title")}</Title>
          {folderId ? (
            <FolderMembersSection folderId={folderId} />
          ) : (
            <Text size="sm" c="dimmed">
              {t("aside.members.emptyRoot")}
            </Text>
          )}
        </Stack>
      </MantineAppShell.Section>
    </MantineAppShell.Aside>
  );
};
