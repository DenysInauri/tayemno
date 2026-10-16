import { useLocation } from "react-router-dom";

import { useAuth } from "../../../../contexts/AuthContext";
import { RouteEnum } from "../../../../enums/routing/RouteEnum";

const NAVBAR_WIDTH = 70;
const ASIDE_WIDTH = 500;

export const useAppShellLayout = () => {
  const { workspace } = useAuth();
  const location = useLocation();

  const isAdminOrOwner =
    !!workspace && (workspace.role === "owner" || workspace.role === "admin");

  const isFilesRoute =
    location.pathname === RouteEnum.HOME ||
    location.pathname.startsWith(RouteEnum.FOLDERS);

  return {
    navbarWidth: NAVBAR_WIDTH,
    asideWidth: ASIDE_WIDTH,
    showAside: isAdminOrOwner && isFilesRoute,
  };
};
