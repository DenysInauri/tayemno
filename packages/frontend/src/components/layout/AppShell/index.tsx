import { AppShell as MantineAppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";

import { HeaderContent } from "./HeaderContent";
import { NavbarContent } from "./NavbarContent";
import { AsideContent } from "./AsideContent";
import { useAppShellLayout } from "./useAppShellLayout";

export const AppShellLayout = () => {
  const { navbarWidth, asideWidth, showAside } = useAppShellLayout();

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{ width: navbarWidth, breakpoint: "sm" }}
      aside={{
        width: asideWidth,
        breakpoint: "sm",
        collapsed: { desktop: !showAside },
      }}
      transitionDuration={200}
    >
      <HeaderContent />

      <MantineAppShell.Navbar p="md">
        <NavbarContent />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>

      {showAside && <AsideContent />}
    </MantineAppShell>
  );
};
