import type { ReactNode } from "react";
import type { WorkspaceRole } from "@tayemno/shared";
import { useAuth } from "../../../contexts/AuthContext";

interface IRoleWrapperProps {
  allowedFor: WorkspaceRole[];
  children: ReactNode;
}

export const RoleWrapper = ({ allowedFor, children }: IRoleWrapperProps) => {
  const { workspace } = useAuth();

  if (!workspace || !allowedFor.includes(workspace.role)) return null;

  return <>{children}</>;
};
