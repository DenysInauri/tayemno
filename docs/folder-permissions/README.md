# Folder Permissions

Adds granular folder-level permissions to Tayemno. Currently folder access is binary (ACL exists or not); after this initiative, each ACL entry carries permission flags that determine what the user can do inside the folder. Three predefined roles (Viewer, Editor, Manager) map to flag combinations. Admins/owners bypass all permission checks.

## Decisions

1. **Three fixed roles, flags in DB.** UI shows Viewer/Editor/Manager; database stores six boolean columns. Future custom combinations possible without migration. Approved.
2. **Permissions returned in folder responses.** `getFolder`, `getFoldersByParent`, `getVaultsByFolder` include a `permissions` object for the current user. `getAllFolders` returns flags on the ACL objects for client-side computation. No separate endpoint. Approved.
3. **Default for new ACLs without explicit role: Editor.** Preserves current behavior during the transition period before the frontend sends roles. Approved.
4. **Manager privileges: add/remove Viewer and Editor only.** Only workspace admin/owner can assign Manager or modify Manager access. Prevents privilege escalation. Approved.
5. **Default role in UI: Viewer.** When adding a member, the dropdown defaults to Viewer (principle of least privilege). Backend default remains Editor for backward compatibility. Approved.
6. **Move requires canDelete on source + canAdd on target.** Approved.
7. **Permission inheritance: nearest ancestor ACL wins.** No per-subfolder overrides. Approved.

## Verified Findings

These are facts from the codebase that the plans rely on. A cold session should re-verify these before trusting them.

| Finding | Location | Detail |
|---------|----------|--------|
| `folderAcls` table has no permission columns | `packages/backend/src/db/schema.ts:146-166` | Only `id`, `folderId`, `userId`, `encryptedFolderKey`, `createdAt`, `updatedAt`. Unique on `(folderId, userId)`. |
| `hasAccessToFolder` returns boolean | `packages/backend/src/repositories/folderAcls/index.ts:117-141` | Recursive CTE: admin/owner OR has ACL on folder/ancestor. Called by 8 vault services. |
| `findByIdAndUserId` returns folder or null | `packages/backend/src/repositories/folders/index.ts:5-65` | Same admin/ancestor logic embedded in SQL. Called by 7 folder services. |
| Aside panel is admin/owner only | `packages/frontend/src/components/layout/AppShell/useAppShellLayout/index.ts:23` | `showAside: isAdminOrOwner && isFilesRoute`. Members never see sharing UI. |
| Action menus have no permission checks | `FolderListItem/index.tsx:62-89`, `VaultListItem/index.tsx:65-92` | Download/Move/Delete always shown. |
| Upload/Create gated by workspace role only | `AddNewEntity/index.tsx:30-42` | `RoleWrapper` checks workspace role, not folder permissions. |
| `bulkCreateFolderAcl` has authorizeAdmin preHandler | `routes/folders/bulkCreateFolderAcl/index.ts:15` | Only route with admin-level auth for ACL operations. |
| `createFolderAcl` / `deleteFolderAcl` have no admin check | `services/folders/createFolderAcl/index.ts:14-19`, `deleteFolderAcl/index.ts:13-17` | Any user with folder access can share/revoke. |
| `findAllByFolderIdWithAncestors` returns members without permissions | `repositories/folderAcls/index.ts:49-83` | Uses `DISTINCT ON (fa.user_id)` ordered by `created_at ASC`. |
| No runtime validation (Zod) on routes | All route files | Routes use TypeScript generics for typing, no schema validation. |
| Audit events are created from the frontend | `usePostAuditLog` hook | Backend stores encrypted payloads sent by client. |
| Drizzle migrations via `npm run db:generate` | `packages/backend/drizzle.config.ts` | Config at `packages/backend/drizzle.config.ts`, output to `packages/backend/drizzle/`. |

## Behavioral Changes

1. **Backend enforces granular permissions.** After Phase 1, services check specific flags (canAdd, canDelete, etc.) instead of binary access. All existing ACLs default to Editor (all content flags true), so no observable behavior change for existing users.
2. **New endpoint for role updates.** `PATCH /:folderId/acl/:userId/role` allows changing a member's folder role.
3. **`bulkCreateFolderAcl` no longer requires authorizeAdmin.** Service-level check replaces route-level middleware; Managers can now add members.
4. **Frontend shows role per member.** After Phase 2, the aside panel shows a role dropdown per member. Managers see the panel (not just admin/owner).
5. **Action buttons are conditional.** Download/Move/Delete/Upload/Create hidden or disabled based on the current user's permissions on the folder.

## Phase Table

| # | Name | Plan | Depends On | Content |
|---|------|------|------------|---------|
| 1 | Backend | [phase-1-backend/plan.md](phase-1-backend/plan.md) | — | Schema migration, `getPermissionsForFolder`, enforce flags in all 15 services, new `updateFolderAclRole` endpoint, updated shared types |
| 2 | Frontend | [phase-2-frontend/plan.md](phase-2-frontend/plan.md) | Phase 1 merged | `useFolderPermissions` hook, role dropdown in member panel, conditional action buttons, aside visible to Managers |

## Out of Scope

- **Custom flag combinations** — only 3 preset roles. Flags in DB enable future extension without migration.
- **Preview-only mode (CanView without CanDownload)** — CanView and CanDownload are always set together. Stored separately for future use.
- **Upload-only role (CanAdd without CanView)** — niche. Can add as a 4th role later.
- **Per-subfolder permission overrides** — inherits from nearest ancestor ACL. No "break inheritance" mechanism.
- **Access expiration** — independent feature.
- **Watermarking** — out of scope.
- **Audit logging for role changes in Phase 1** — audit events are frontend-created; role change audit will ship in Phase 2.
