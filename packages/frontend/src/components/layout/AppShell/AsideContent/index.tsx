import { AppShell as MantineAppShell } from "@mantine/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Tabs, TabsList, TabsTab, TabsPanel } from "../../../ui/Tabs";
import { Text } from "../../../ui/Text";
import { SizeEnum } from "../../../../enums/ui/SizeEnum";
import { FolderMembersSection } from "./FolderMembersSection";
import classes from "./index.module.css";

export const AsideContent = () => {
  const { t } = useTranslation();
  const { folderId } = useParams<{ folderId: string }>();

  return (
    <MantineAppShell.Aside
      p={SizeEnum.MD}
      className={classes.aside}
    >
      <Tabs
        defaultValue="members"
        className={classes.tabs}
      >
        <TabsList>
          <TabsTab value="members">{t("aside.tabs.members")}</TabsTab>
        </TabsList>
        <TabsPanel
          value="members"
          className={classes.tabPanel}
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
