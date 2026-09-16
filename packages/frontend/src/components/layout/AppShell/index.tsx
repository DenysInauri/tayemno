import {
  AppShell as MantineAppShell,
  NavLink,
  Burger,
  Group,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconFolder, IconSettings, IconLogout } from "@tabler/icons-react";

import { useAuth } from "../../../contexts/AuthContext";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

export const AppShellLayout = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <MantineAppShell
      navbar={{
        width: 250,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      header={{ height: { base: 50, sm: 0 } }}
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" />
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <MantineAppShell.Section grow>
          <NavLink
            label={t("nav.files")}
            leftSection={<IconFolder size={20} />}
            active={
              location.pathname === RouteEnum.HOME ||
              location.pathname.startsWith(RouteEnum.FOLDERS)
            }
            onClick={() => {
              navigate(RouteEnum.HOME);
              close();
            }}
          />
          <NavLink
            label={t("nav.settings")}
            leftSection={<IconSettings size={20} />}
            active={location.pathname === RouteEnum.SETTINGS}
            onClick={() => {
              navigate(RouteEnum.SETTINGS);
              close();
            }}
          />
        </MantineAppShell.Section>

        <MantineAppShell.Section>
          <NavLink
            label={t("nav.signOut")}
            leftSection={<IconLogout size={20} />}
            onClick={signOut}
          />
        </MantineAppShell.Section>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
};
