import { AppShell as MantineAppShell, NavLink, Tooltip } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconFolder, IconUsers } from "@tabler/icons-react";

import { RoleWrapper } from "../../../routing/RoleWrapper";
import { RouteEnum } from "../../../../enums/routing/RouteEnum";
import classes from "./index.module.css";

export const NavbarContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <MantineAppShell.Section grow className={classes.navItems}>
      <Tooltip label={t("nav.files")} position="right">
        <NavLink
          leftSection={<IconFolder size={20} />}
          active={
            location.pathname === RouteEnum.HOME ||
            location.pathname.startsWith(RouteEnum.FOLDERS)
          }
          onClick={() => navigate(RouteEnum.HOME)}
        />
      </Tooltip>
      <RoleWrapper allowedFor={["owner", "admin"]}>
        <Tooltip label={t("nav.users")} position="right">
          <NavLink
            leftSection={<IconUsers size={20} />}
            active={location.pathname === RouteEnum.USERS}
            onClick={() => navigate(RouteEnum.USERS)}
          />
        </Tooltip>
      </RoleWrapper>
    </MantineAppShell.Section>
  );
};
