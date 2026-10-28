import { useTranslation } from "react-i18next";
import type { IFolderPermissions } from "@tayemno/shared";
import { Drawer } from "../../ui/Drawer";
import { FolderMembersSection } from "../../layout/AppShell/AsideContent/FolderMembersSection";

const BODY_STYLES = { display: "flex", flexDirection: "column" as const, overflow: "hidden" };

interface IProps {
  opened: boolean;
  onClose: () => void;
  folderId: string;
  permissions: IFolderPermissions;
}

export const ManageAccessDrawer = ({ opened, onClose, folderId, permissions }: IProps) => {
  const { t } = useTranslation();

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size={500} title={t("files.manageAccess.drawerTitle")} styles={{ body: BODY_STYLES }}>
      <FolderMembersSection folderId={folderId} permissions={permissions} />
    </Drawer>
  );
};
