import { useTranslation } from "react-i18next";
import { Drawer } from "../../ui/Drawer";
import { AuditLogSection } from "../../layout/AppShell/AsideContent/AuditLogSection";

const DRAWER_STYLES = {
  content: { display: "flex", flexDirection: "column" as const },
  body: { display: "flex", flexDirection: "column" as const, overflow: "hidden", flex: 1, minHeight: 0 },
};

interface IProps {
  opened: boolean;
  onClose: () => void;
  folderId: string | null;
  vaultId: string | null;
}

export const AuditLogsDrawer = ({ opened, onClose, folderId, vaultId }: IProps) => {
  const { t } = useTranslation();

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size={500} title={t("files.auditLogs.drawerTitle")} styles={DRAWER_STYLES}>
      <AuditLogSection folderId={folderId} vaultId={vaultId} />
    </Drawer>
  );
};
