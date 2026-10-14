import { useState } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../../../../contexts/AuthContext";
import { RouteEnum } from "../../../../enums/routing/RouteEnum";

const NAVBAR_EXPANDED_WIDTH = 250;
const NAVBAR_COLLAPSED_WIDTH = 70;
const ASIDE_WIDTH = 500;

export const useAppShellLayout = () => {
  const [navbarExpanded, setNavbarExpanded] = useState(false);
  const { workspace } = useAuth();
  const location = useLocation();

  const isAdminOrOwner =
    !!workspace && (workspace.role === "owner" || workspace.role === "admin");

  const isFilesRoute =
    location.pathname === RouteEnum.HOME ||
    location.pathname.startsWith(RouteEnum.FOLDERS);

  return {
    navbarExpanded,
    toggleNavbar: () => setNavbarExpanded((prev) => !prev),
    navbarWidth: navbarExpanded
      ? NAVBAR_EXPANDED_WIDTH
      : NAVBAR_COLLAPSED_WIDTH,
    asideWidth: ASIDE_WIDTH,
    showAside: isAdminOrOwner && isFilesRoute,
  };
};
