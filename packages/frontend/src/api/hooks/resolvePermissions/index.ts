import type { IFolderPermissions, WorkspaceRole } from "@tayemno/shared";

const ALL_PERMISSIONS: IFolderPermissions = {
  canView: true, canDownload: true, canAdd: true, canEdit: true, canDelete: true, canManageMembers: true,
};

const DEFAULT_PERMISSIONS: IFolderPermissions = {
  canView: true, canDownload: true, canAdd: true, canEdit: true, canDelete: true, canManageMembers: false,
};

export const resolvePermissions = (
  workspaceRole: WorkspaceRole | undefined,
  rawPermissions: IFolderPermissions | null | undefined,
): IFolderPermissions => {
  if (workspaceRole === "owner" || workspaceRole === "admin") return ALL_PERMISSIONS;
  if (!rawPermissions) return DEFAULT_PERMISSIONS;
  return rawPermissions;
};
