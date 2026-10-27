import { AppShell as MantineAppShell, NavLink } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconFolder, IconFileAnalytics, IconUsers } from "@tabler/icons-react";

import { RoleWrapper } from "../../../routing/RoleWrapper";
import { RouteEnum } from "../../../../enums/routing/RouteEnum";
import classes from "./index.module.css";

export const NavbarContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <MantineAppShell.Section grow className={classes.navItems}>
      <NavLink
        label={t("nav.files")}
        leftSection={<IconFolder size={20} />}
        active={
          location.pathname === RouteEnum.HOME ||
          location.pathname.startsWith(RouteEnum.FOLDERS)
        }
        onClick={() => navigate(RouteEnum.HOME)}
      />
      <RoleWrapper allowedFor={["owner", "admin"]}>
        <NavLink
          label={t("nav.users")}
          leftSection={<IconUsers size={20} />}
          active={location.pathname === RouteEnum.USERS}
          onClick={() => navigate(RouteEnum.USERS)}
        />
        <NavLink
          label={t("nav.auditLogs")}
          leftSection={<IconFileAnalytics size={20} />}
          active={location.pathname === RouteEnum.AUDIT_LOGS}
          onClick={() => navigate(RouteEnum.AUDIT_LOGS)}
        />
      </RoleWrapper>
    </MantineAppShell.Section>
  );
};
