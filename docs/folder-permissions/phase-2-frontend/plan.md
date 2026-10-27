# Phase 2 — Frontend

**Size:** ~15 files. The permission data comes from API responses (added in Phase 1). This phase reads that data and conditionally renders UI elements.

**Why this approach is sufficient — don't add anything beyond this:** Permissions flow from existing API hooks — no new API calls needed. A simple `useFolderPermissions` hook reads permissions from cached query data. Action buttons use the permission flags directly — no permission context provider, no HOC, no middleware pattern. Keep it simple: read permissions, pass as props, conditionally render.

---

## Prerequisites from Phase 1

Before starting, verify these exist:

- `packages/shared/src/index.ts` exports: `FolderRole`, `IFolderPermissions`, `FOLDER_ROLE_PERMISSIONS`, `getFolderRoleFromPermissions`
- `IGetFoldersByParentResponse` has `permissions: IFolderPermissions` field
- `IGetVaultsByFolderResponse` has `permissions: IFolderPermissions` field
- `IGetFolderResponse` has `permissions: IFolderPermissions` field
- `IFolderMemberItem` has `role: FolderRole` field
- `ICreateFolderAclRequest` has `role?: FolderRole` field
- `FolderAcl` has the six boolean permission fields
- Backend endpoint `PATCH /:folderId/acl/:userId/role` exists
- `AuditActionEnum.FOLDER_ACL_ROLE_CHANGED` exists

If any of these are missing, STOP and report — do not improvise.

---

## Step 1 — Add API hook for updating folder ACL role

**New file:** `packages/frontend/src/api/hooks/usePatchFolderAclRole/index.ts`

Follow the pattern of `useDeleteFolderAcl` hook (read it first). It should:

- Call `PATCH /workspaces/{workspaceId}/folders/{folderId}/acl/{userId}/role`
- Body: `{ role: FolderRole }`
- Invalidate `QueryKeyEnum.FOLDER_MEMBERS` on success
- Return `{ updateRole, isUpdating }` or similar

Add the endpoint to `EndpointEnum` if the codebase uses one (verify first).

## Step 2 — Update useGetFolders and useGetVaults hooks to expose permissions

**Files:** Find the hooks that call `getFoldersByParent` and `getVaultsByFolder` (likely `useGetFolders/index.ts` and `useGetVaults/index.ts` or similar names — search for `QueryKeyEnum.FOLDERS` and `QueryKeyEnum.VAULTS`).

The API response now includes `permissions: IFolderPermissions`. The hooks should expose this in their return value:

```typescript
// Example pattern:
return {
  folders: data?.folders ?? [],
  permissions: data?.permissions ?? null,
  isLoading,
};
```

No changes to the query key or fetch logic — just expose the new field from the existing response.

## Step 3 — Create `useFolderPermissions` hook

**New file:** `packages/frontend/src/hooks/useFolderPermissions/index.ts`

This is a convenience hook that resolves the current user's permissions for a given folder ID. It reads from the already-cached folder query data rather than making new API calls.

```typescript
import type { IFolderPermissions } from "@tayemno/shared";
import { useAuth } from "../../contexts/AuthContext";

const ALL_PERMISSIONS: IFolderPermissions = {
  canView: true,
  canDownload: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canManageMembers: true,
};

export const useFolderPermissions = (permissions: IFolderPermissions | null): IFolderPermissions => {
  const { workspace } = useAuth();

  if (!workspace) return ALL_PERMISSIONS;

  const isAdmin = workspace.role === "owner" || workspace.role === "admin";
  if (isAdmin) return ALL_PERMISSIONS;

  return permissions ?? ALL_PERMISSIONS;
};
```

**Design note:** This hook takes the `permissions` object from the API response as a parameter (not a folder ID). The parent component passes it down. This avoids extra query lookups and keeps the hook pure. Admins always get all permissions regardless of what the API returns.

**Alternative (equally valid):** Skip this hook entirely and just pass `permissions` from the API response as props. The admin override is already handled server-side. Decide based on what feels cleaner when implementing — either approach works. The key point is: do NOT create a context provider or fetch permissions separately.

## Step 4 — Update `FolderMemberRow` to show role dropdown

**File:** `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMemberRow/index.tsx`

Currently shows member name, email, status badge, inherited info, and a menu with "Revoke" action.

Changes:
- Add a role dropdown (`Select` or `NativeSelect` from Mantine) showing the member's `role` from `IFolderMemberItem`
- Display options: `Viewer`, `Editor`, `Manager`
- `Manager` option visible only if the current user is workspace admin/owner
- Dropdown disabled for inherited members (inherited = true)
- Dropdown disabled for the current user (cannot change own role)
- On change, call `usePatchFolderAclRole` with the new role
- Show the role as a read-only badge/text for users without `canManageMembers`

**Props change:** The component needs to know:
- Whether the current user can manage members (`canManageMembers: boolean`)
- Whether the current user is workspace admin (`isAdmin: boolean` — for showing Manager option)
- The `folderId` (for the API call)

These props flow from `FolderMembersSection`.

Use i18n keys for role labels: `files.roles.viewer`, `files.roles.editor`, `files.roles.manager`.

## Step 5 — Update `AddMemberSelect` to include role selection

**File:** `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/AddMemberSelect/index.tsx`

Currently a MultiSelect for picking workspace members + submit button.

Changes:
- Add a role `Select` dropdown next to the submit button. Default value: `"viewer"`.
- `Manager` option visible only if the current user is workspace admin/owner.
- Pass the selected role to the `onAdd` callback.
- The parent (`FolderMembersSection`) includes the role in the bulk ACL request.

**Props change:** Add `isAdmin: boolean` prop to control Manager option visibility.

## Step 6 — Update `FolderMembersSection` to pass role data

**File:** `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx`

Changes:
- Read `canManageMembers` from the current user's permissions (passed via props or resolved from API data)
- Pass `canManageMembers` and `isAdmin` to `FolderMemberRow` and `AddMemberSelect`
- When building the bulk ACL payload (`buildAddMembersPayload`), include the selected `role`
- Show the "Add Member" button only when `canManageMembers` is true (not just for admin/owner)

**Props change:** The component needs the current user's permissions for this folder. Add `permissions: IFolderPermissions` prop. This flows from the parent that renders the aside content.

## Step 7 — Update aside panel visibility

**File:** `packages/frontend/src/components/layout/AppShell/useAppShellLayout/index.ts`

Currently:
```typescript
showAside: isAdminOrOwner && isFilesRoute,
```

This needs to also show for Managers. But `useAppShellLayout` doesn't have access to folder permissions (it doesn't know the current folder).

**Two options (pick whichever is simpler when implementing):**

**Option A:** Show aside for all workspace members on file routes. The aside content itself handles what to display based on permissions. This is simpler — the aside just becomes a read-only member list for non-managers.

```typescript
showAside: !!workspace && isFilesRoute,
```

Then inside `FolderMembersSection`, hide the "Add Member" button and role dropdowns for users without `canManageMembers`.

**Option B:** Pass `canManageMembers` up to the layout hook. This requires threading permissions through the component tree, which is more complex.

**Recommendation: Option A.** Show the aside for everyone on file routes. Non-managers see a read-only member list (useful for knowing who has access). Managers and admins see management controls.

## Step 8 — Update `AddNewEntity` (upload/create buttons)

**File:** `packages/frontend/src/components/files/AddNewEntity/index.tsx`

Currently uses `RoleWrapper` for workspace-level role gating. Replace with permission-based visibility.

Changes:
- Accept `permissions: IFolderPermissions | null` as prop
- Show upload/create buttons only when `permissions.canAdd` is true
- Remove or adjust the `RoleWrapper` usage — permissions now come from folder-level, not workspace-level

```typescript
// BEFORE:
<RoleWrapper allowedFor={["owner", "admin", "member"]}>
  <UploadFileActions folderId={folderId} />
  ...
</RoleWrapper>

// AFTER:
{permissions?.canAdd && (
  <>
    <UploadFileActions folderId={folderId} />
    <UploadFolderAction folderId={folderId} />
    <CreateFolderAction folderId={folderId} />
  </>
)}
```

For workspace root (no permissions from API, folderId is null): admin/owner/member can upload (current behavior). Use `useFolderPermissions` hook or inline logic.

## Step 9 — Update `FolderListItem` action menu

**File:** `packages/frontend/src/components/files/FolderListItem/index.tsx`

Currently shows Download/Move/Delete unconditionally.

Changes:
- Accept `permissions: IFolderPermissions` as prop
- **Download as ZIP:** always shown (all roles have canDownload)
- **Move:** shown only when `permissions.canDelete` (moving out = deleting from source)
- **Delete:** shown only when `permissions.canDelete`

```typescript
<Menu.Dropdown>
  <Menu.Item leftSection={<IconFileZip size={16} />} onClick={() => downloadFolder(folder)}>
    {t("files.actions.downloadAsZip")}
  </Menu.Item>
  {permissions.canDelete && (
    <Menu.Item leftSection={<IconArrowsMove size={14} />} onClick={openMoveModal}>
      {t("files.actions.move")}
    </Menu.Item>
  )}
  {permissions.canDelete && (
    <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={openDeleteModal}>
      {t("files.actions.delete")}
    </Menu.Item>
  )}
</Menu.Dropdown>
```

If all action items are hidden (Viewer — only download remains), still show the menu with just the download option.

## Step 10 — Update `VaultListItem` action menu

**File:** `packages/frontend/src/components/files/VaultListItem/index.tsx`

Same pattern as Step 9:
- Accept `permissions: IFolderPermissions` as prop
- **Download:** always shown (canDownload is true for all roles)
- **Move:** shown only when `permissions.canDelete`
- **Delete:** shown only when `permissions.canDelete`

## Step 11 — Update `PreviewHeader` download button

**File:** `packages/frontend/src/components/files/PreviewOverlay/PreviewHeader/index.tsx`

Currently always shows download button.

Changes:
- Accept `permissions: IFolderPermissions` as prop (or receive it through `PreviewOverlay` parent)
- Show download button only when `permissions.canDownload` (always true for current roles, but future-proofs for preview-only mode)

For launch this is a no-op (canDownload is always true), but adding the prop now means no changes needed when preview-only ships.

## Step 12 — Update `MoveItemModal` to disable non-canAdd folders

**File:** `packages/frontend/src/components/files/MoveItemModal/index.tsx`

Currently `disabledFolders` is a list of folder IDs (the source folder is disabled to prevent circular moves). The modal uses `useLazyFolderTree` which returns all accessible folders.

Changes:
- The `getAllFolders` response already includes ACL data with permission flags (Phase 1, Step 11d).
- In the folder tree, disable folders where the user lacks `canAdd`.
- Compute disabled folders by checking each folder's effective permissions:
  1. Get the user's ACLs from `getAllFolders` response
  2. For each folder, find the nearest ancestor ACL
  3. If `canAdd` is false, add to `disabledFolders`
- Admins always have `canAdd` on all folders.

This computation lives in the tree-building hook (`useLazyFolderTree` or wherever the tree data is assembled). Keep the logic simple — iterate folders, find matching ACL, check `canAdd`.

## Step 13 — Pass permissions through the component tree

**File:** `packages/frontend/src/pages/HomePage/index.tsx` (or wherever the file browser lives)

This is the wiring step — passing `permissions` from the API response hooks down to child components.

```
HomePage
  └─ FileToolbar
  │    └─ AddNewEntity ← needs permissions.canAdd
  └─ VirtualizedFileTable
       ├─ FolderListItem ← needs permissions (canDelete, canDownload)
       └─ VaultListItem  ← needs permissions (canDelete, canDownload)
```

The `permissions` object comes from `useGetFolders` or `useGetVaults` hook (updated in Step 2). Pass it as props down the tree.

Also update `VirtualizedFileTable` to accept and forward permissions.

## Step 14 — Update `buildAddMembersPayload` to include role

**File:** `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/buildAddMembersPayload/index.ts`

Currently builds `ICreateFolderAclRequest[]` with `{ userId, encryptedFolderKey }`.

Add the selected role:

```typescript
// BEFORE:
return members.map((member) => ({
  userId: member.userId,
  encryptedFolderKey: encryptedKeys[member.userId],
}));

// AFTER:
return members.map((member) => ({
  userId: member.userId,
  encryptedFolderKey: encryptedKeys[member.userId],
  role,  // FolderRole parameter passed to this function
}));
```

Update the function signature to accept `role: FolderRole`.

## Step 15 — Add i18n keys

**File:** Find the translation JSON files (likely `packages/frontend/src/locales/` or similar).

Add keys for role labels:
```json
{
  "files": {
    "roles": {
      "viewer": "Viewer",
      "editor": "Editor",
      "manager": "Manager"
    }
  }
}
```

Add translations for both English and Ukrainian (or whatever languages exist). Check existing i18n files for the exact structure.

## Step 16 — Add audit logging for role changes

In `FolderMembersSection` (or the role change handler), log a `FOLDER_ACL_ROLE_CHANGED` audit event when a member's role is changed via the dropdown. Follow the existing pattern used for `FOLDER_ACL_CREATED` and `FOLDER_ACL_REVOKED` in the same file.

---

## Checklist before marking complete

- [ ] `npm run build -w packages/frontend` succeeds
- [ ] Aside panel shows for all workspace members on file routes (not just admin/owner)
- [ ] Members with `canManageMembers` see role dropdowns and "Add Member" button
- [ ] Members without `canManageMembers` see a read-only member list
- [ ] Role dropdown shows Viewer/Editor for Managers; Viewer/Editor/Manager for admins
- [ ] Upload/Create buttons hidden when user lacks `canAdd`
- [ ] Delete/Move menu items hidden when user lacks `canDelete`
- [ ] MoveItemModal disables folders where user lacks `canAdd`
- [ ] Default role when adding members is Viewer
- [ ] Role included in bulk ACL creation request
- [ ] All files under 120 lines (extract if needed)
- [ ] CSS modules used for any new styles (no inline styles for static values)
- [ ] i18n keys used for all user-visible strings
