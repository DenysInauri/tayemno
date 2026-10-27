import { AppShell as MantineAppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";

import { HeaderContent } from "./HeaderContent";
import { NavbarContent } from "./NavbarContent";
import { useAppShellLayout } from "./useAppShellLayout";

export const AppShellLayout = () => {
  const { navbarWidth } = useAppShellLayout();

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: navbarWidth, breakpoint: "sm" }}
    >
      <HeaderContent />

      <MantineAppShell.Navbar p="md">
        <NavbarContent />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
};
