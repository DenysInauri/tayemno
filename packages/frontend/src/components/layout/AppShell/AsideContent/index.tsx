import { useMemo } from "react";
import { AppShell as MantineAppShell } from "@mantine/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Tabs, TabsList, TabsTab, TabsPanel } from "../../../ui/Tabs";
import { Text } from "../../../ui/Text";
import { SizeEnum } from "../../../../enums/ui/SizeEnum";
import { useSelectedItem } from "../../../../hooks/useSelectedItem";
import { useFolders } from "../../../../api/hooks/useFolders";
import { FolderMembersSection } from "./FolderMembersSection";
import { AuditLogSection } from "./AuditLogSection";
import classes from "./index.module.css";
import { SelectedClaudeTreeItemTypeEnum } from "../../../../enums/routing/SelectedClaudeTreeItemTypeEnum";

export const AsideContent = () => {
  const { t } = useTranslation();
  const { folderId: routeFolderId } = useParams<{ folderId: string }>();
  const { selectedItem } = useSelectedItem();

  const effectiveFolderId = useMemo(() => {
    if (selectedItem?.type === SelectedClaudeTreeItemTypeEnum.FOLDER) {
      return selectedItem.id;
    }
    if (selectedItem) return routeFolderId ?? null;
    return routeFolderId ?? null;
  }, [selectedItem, routeFolderId]);

  const effectiveVaultId =
    selectedItem?.type === SelectedClaudeTreeItemTypeEnum.FILE
      ? selectedItem.id
      : null;

  const membersFolderId =
    selectedItem?.type === SelectedClaudeTreeItemTypeEnum.FOLDER
      ? selectedItem.id
      : routeFolderId;

  const { permissions } = useFolders(membersFolderId ?? null);

  return (
    <MantineAppShell.Aside p={SizeEnum.MD} className={classes.aside}>
      <Tabs defaultValue="members" className={classes.tabs}>
        <TabsList>
          <TabsTab value="members">{t("aside.tabs.members")}</TabsTab>
          <TabsTab value="activity">{t("aside.tabs.activity")}</TabsTab>
        </TabsList>
        <TabsPanel value="members" className={classes.tabPanel}>
          {membersFolderId ? (
            <FolderMembersSection folderId={membersFolderId} permissions={permissions} />
          ) : (
            <Text size="sm" c="dimmed" mt={SizeEnum.SM}>
              {t("aside.members.emptyRoot")}
            </Text>
          )}
        </TabsPanel>
        <TabsPanel value="activity" className={classes.tabPanel}>
          <AuditLogSection
            folderId={effectiveFolderId}
            vaultId={effectiveVaultId}
          />
        </TabsPanel>
      </Tabs>
    </MantineAppShell.Aside>
  );
};
