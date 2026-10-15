import { AppShell as MantineAppShell } from "@mantine/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Tabs, TabsList, TabsTab, TabsPanel } from "../../../ui/Tabs";
import { Text } from "../../../ui/Text";
import { SizeEnum } from "../../../../enums/ui/SizeEnum";
import { FolderMembersSection } from "./FolderMembersSection";

export const AsideContent = () => {
  const { t } = useTranslation();
  const { folderId } = useParams<{ folderId: string }>();

  return (
    <MantineAppShell.Aside
      p={SizeEnum.MD}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Tabs
        defaultValue="members"
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
      >
        <TabsList>
          <TabsTab value="members">{t("aside.tabs.members")}</TabsTab>
        </TabsList>
        <TabsPanel
          value="members"
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          {folderId ? (
            <FolderMembersSection folderId={folderId} />
          ) : (
            <Text size="sm" c="dimmed" mt={SizeEnum.SM}>
              {t("aside.members.emptyRoot")}
            </Text>
          )}
        </TabsPanel>
      </Tabs>
    </MantineAppShell.Aside>
  );
};
