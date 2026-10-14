import { AppShell as MantineAppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";

import { NavbarContent } from "./NavbarContent";
import { AsideContent } from "./AsideContent";
import { useAppShellLayout } from "./useAppShellLayout";

export const AppShellLayout = () => {
  const { navbarExpanded, toggleNavbar, navbarWidth, asideWidth, showAside } =
    useAppShellLayout();

  return (
    <MantineAppShell
      navbar={{ width: navbarWidth, breakpoint: "sm" }}
      aside={{
        width: asideWidth,
        breakpoint: "sm",
        collapsed: { desktop: !showAside },
      }}
      transitionDuration={200}
    >
      <MantineAppShell.Navbar p="md">
        <NavbarContent expanded={navbarExpanded} onToggle={toggleNavbar} />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>

      {showAside && <AsideContent />}
    </MantineAppShell>
  );
};
