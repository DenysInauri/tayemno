import { AppShell as MantineAppShell, NavLink } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconFolder,
  IconSettings,
  IconUsers,
  IconLogout,
  IconChevronRight,
  IconChevronLeft,
} from "@tabler/icons-react";

import { RoleWrapper } from "../../../routing/RoleWrapper";
import { ActionIcon } from "../../../ui/ActionIcon";
import { useAuth } from "../../../../contexts/AuthContext";
import { RouteEnum } from "../../../../enums/routing/RouteEnum";
import classes from "./index.module.css";

interface IProps {
  expanded: boolean;
  onToggle: () => void;
}

export const NavbarContent = ({ expanded, onToggle }: IProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <>
      <MantineAppShell.Section grow>
        <NavLink
          label={expanded ? t("nav.files") : undefined}
          leftSection={<IconFolder size={20} />}
          active={
            location.pathname === RouteEnum.HOME ||
            location.pathname.startsWith(RouteEnum.FOLDERS)
          }
          onClick={() => navigate(RouteEnum.HOME)}
        />
        <NavLink
          label={expanded ? t("nav.settings") : undefined}
          leftSection={<IconSettings size={20} />}
          active={location.pathname === RouteEnum.SETTINGS}
          onClick={() => navigate(RouteEnum.SETTINGS)}
        />
        <RoleWrapper allowedFor={["owner", "admin"]}>
          <NavLink
            label={expanded ? t("nav.users") : undefined}
            leftSection={<IconUsers size={20} />}
            active={location.pathname === RouteEnum.USERS}
            onClick={() => navigate(RouteEnum.USERS)}
          />
        </RoleWrapper>
      </MantineAppShell.Section>

      <MantineAppShell.Section>
        <NavLink
          label={expanded ? t("nav.signOut") : undefined}
          leftSection={<IconLogout size={20} />}
          onClick={signOut}
        />
        <ActionIcon
          variant="subtle"
          onClick={onToggle}
          className={classes.toggleButton}
        >
          {expanded ? (
            <IconChevronLeft size={18} />
          ) : (
            <IconChevronRight size={18} />
          )}
        </ActionIcon>
      </MantineAppShell.Section>
    </>
  );
};
