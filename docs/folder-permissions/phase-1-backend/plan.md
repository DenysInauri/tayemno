# Phase 1 — Backend

**Size:** ~27 files. Most service changes are mechanical — replace binary access check with permission-aware check and verify a specific flag.

**Why this approach is sufficient — don't add anything beyond this:** All existing ACLs default to Editor (all content flags true, canManageMembers false), so no observable behavior change for existing users. The frontend still sends ACL requests without role — backend defaults to Editor. Phase 2 (frontend) will add role selection and action controls. Do NOT add frontend changes, runtime validation (Zod), permission caching, or middleware-level permission checks in this phase.

---

## Step 1 — Add permission columns to schema

**File:** `packages/backend/src/db/schema.ts`

In the `folderAcls` table definition (currently lines 146-166), add six boolean columns after `encryptedFolderKey` and before `createdAt`:

```typescript
// BEFORE (line 156):
    encryptedFolderKey: text("encrypted_folder_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })

// AFTER:
    encryptedFolderKey: text("encrypted_folder_key").notNull(),
    canView: boolean("can_view").default(true).notNull(),
    canDownload: boolean("can_download").default(true).notNull(),
    canAdd: boolean("can_add").default(true).notNull(),
    canEdit: boolean("can_edit").default(true).notNull(),
    canDelete: boolean("can_delete").default(true).notNull(),
    canManageMembers: boolean("can_manage_members").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
```

Add `boolean` to the Drizzle imports at the top of the file (verify current imports first — it likely imports from `drizzle-orm/pg-core`).

## Step 2 — Generate migration

```bash
npm run db:generate -w packages/backend
```

This creates a new migration in `packages/backend/drizzle/`. Verify it contains six `ALTER TABLE "folder_acls" ADD COLUMN` statements with correct defaults. Existing rows get `true` for all content columns and `false` for `can_manage_members` — this is the Editor role.

## Step 3 — Update shared types

**File:** `packages/shared/src/index.ts`

### 3a — Add FolderRole type and IFolderPermissions interface

Add near the top of the file (after the existing WorkspaceRole type at line 39):

```typescript
export type FolderRole = "viewer" | "editor" | "manager";

export interface IFolderPermissions {
  canView: boolean;
  canDownload: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
}

export const FOLDER_ROLE_PERMISSIONS: Record<FolderRole, IFolderPermissions> = {
  viewer: { canView: true, canDownload: true, canAdd: false, canEdit: false, canDelete: false, canManageMembers: false },
  editor: { canView: true, canDownload: true, canAdd: true, canEdit: true, canDelete: true, canManageMembers: false },
  manager: { canView: true, canDownload: true, canAdd: true, canEdit: true, canDelete: true, canManageMembers: true },
};

export const getFolderRoleFromPermissions = (p: IFolderPermissions): FolderRole => {
  if (p.canManageMembers) return "manager";
  if (p.canAdd) return "editor";
  return "viewer";
};
```

### 3b — Update FolderAcl interface

```typescript
// BEFORE (lines 105-112):
export interface FolderAcl {
  id: string;
  folderId: string;
  userId: string;
  encryptedFolderKey: string;
  createdAt: string;
  updatedAt: string;
}

// AFTER:
export interface FolderAcl {
  id: string;
  folderId: string;
  userId: string;
  encryptedFolderKey: string;
  canView: boolean;
  canDownload: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 3c — Update IFolderMemberItem

```typescript
// BEFORE (lines 388-397):
export interface IFolderMemberItem {
  userId: string;
  name: string;
  email: string;
  inherited: boolean;
  ancestorFolderId?: string;
  ancestorEncryptedName?: string;
  ancestorNameNonce?: string;
  createdAt: string;
}

// AFTER:
export interface IFolderMemberItem {
  userId: string;
  name: string;
  email: string;
  role: FolderRole;
  inherited: boolean;
  ancestorFolderId?: string;
  ancestorEncryptedName?: string;
  ancestorNameNonce?: string;
  createdAt: string;
}
```

### 3d — Update ICreateFolderAclRequest

```typescript
// BEFORE (lines 375-378):
export interface ICreateFolderAclRequest {
  userId: string;
  encryptedFolderKey: string;
}

// AFTER:
export interface ICreateFolderAclRequest {
  userId: string;
  encryptedFolderKey: string;
  role?: FolderRole;
}
```

### 3e — Add new request/response types for role update

```typescript
export interface IUpdateFolderAclRoleRequest {
  role: FolderRole;
}

export interface IUpdateFolderAclRoleResponse {
  message: string;
}
```

### 3f — Update folder/vault list response types to include permissions

```typescript
// BEFORE:
export interface IGetFolderResponse {
  folder: Folder;
}

// AFTER:
export interface IGetFolderResponse {
  folder: Folder;
  permissions: IFolderPermissions;
}
```

```typescript
// BEFORE:
export interface IGetFoldersByParentResponse {
  folders: Folder[];
}

// AFTER:
export interface IGetFoldersByParentResponse {
  folders: Folder[];
  permissions: IFolderPermissions;
}
```

```typescript
// BEFORE:
export interface IGetVaultsByFolderResponse {
  vaults: Vault[];
}

// AFTER:
export interface IGetVaultsByFolderResponse {
  vaults: Vault[];
  permissions: IFolderPermissions;
}
```

### 3g — Add audit action

In `AuditActionEnum`, add:

```typescript
FOLDER_ACL_ROLE_CHANGED = "folder_acl.role_changed",
```

## Step 4 — Add `getPermissionsForFolder` to folderAcls repository

**File:** `packages/backend/src/repositories/folderAcls/index.ts`

Add a new exported function. This replaces `hasAccessToFolder` as the primary permission check. One SQL query using `LEFT JOIN LATERAL` for efficiency.

```typescript
import type { IFolderPermissions } from "@tayemno/shared";

const ALL_PERMISSIONS: IFolderPermissions = {
  canView: true,
  canDownload: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canManageMembers: true,
};

export const getPermissionsForFolder = async (
  db: Database,
  folderId: string,
  userId: string,
): Promise<IFolderPermissions | null> => {
  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_folder_id, 0 AS depth FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id, f.parent_folder_id, a.depth + 1
      FROM folders f
      INNER JOIN ancestors a ON f.id = a.parent_folder_id
    )
    SELECT
      wm.role AS "workspaceRole",
      na.can_view AS "canView",
      na.can_download AS "canDownload",
      na.can_add AS "canAdd",
      na.can_edit AS "canEdit",
      na.can_delete AS "canDelete",
      na.can_manage_members AS "canManageMembers"
    FROM workspace_members wm
    LEFT JOIN LATERAL (
      SELECT fa.can_view, fa.can_download, fa.can_add, fa.can_edit,
             fa.can_delete, fa.can_manage_members
      FROM folder_acls fa
      INNER JOIN ancestors a ON fa.folder_id = a.id
      WHERE fa.user_id = ${userId}
      ORDER BY a.depth ASC
      LIMIT 1
    ) na ON true
    WHERE wm.workspace_id = (SELECT workspace_id FROM folders WHERE id = ${folderId})
      AND wm.user_id = ${userId}
  `);

  const row = (rows as unknown as {
    workspaceRole: string;
    canView: boolean | null;
    canDownload: boolean | null;
    canAdd: boolean | null;
    canEdit: boolean | null;
    canDelete: boolean | null;
    canManageMembers: boolean | null;
  }[])[0];

  if (!row) return null; // not a workspace member

  if (row.workspaceRole === "owner" || row.workspaceRole === "admin") {
    return ALL_PERMISSIONS;
  }

  if (row.canView === null) return null; // member but no folder ACL

  return {
    canView: row.canView,
    canDownload: row.canDownload!,
    canAdd: row.canAdd!,
    canEdit: row.canEdit!,
    canDelete: row.canDelete!,
    canManageMembers: row.canManageMembers!,
  };
};
```

**Do NOT delete `hasAccessToFolder`.** Keep it for now — it is still used by `findByIdAndUserId` inline SQL and removing it could break other consumers. It will be unused after all services migrate, but cleanup is not in scope.

## Step 5 — Add `updatePermissions` to folderAcls repository

**File:** `packages/backend/src/repositories/folderAcls/index.ts`

```typescript
export const updatePermissions = async (
  db: Database,
  folderId: string,
  userId: string,
  permissions: IFolderPermissions,
) => {
  await db
    .update(folderAcls)
    .set({
      canView: permissions.canView,
      canDownload: permissions.canDownload,
      canAdd: permissions.canAdd,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      canManageMembers: permissions.canManageMembers,
    })
    .where(
      and(
        eq(folderAcls.folderId, folderId),
        eq(folderAcls.userId, userId),
      ),
    );
};
```

## Step 6 — Update `findAllByFolderIdWithAncestors` to return permission flags

**File:** `packages/backend/src/repositories/folderAcls/index.ts`

In the SQL query (currently lines 49-83), add permission columns to the SELECT clause:

```sql
-- ADD these columns to the SELECT:
      fa.can_view AS "canView",
      fa.can_download AS "canDownload",
      fa.can_add AS "canAdd",
      fa.can_edit AS "canEdit",
      fa.can_delete AS "canDelete",
      fa.can_manage_members AS "canManageMembers"
```

Update the TypeScript return type to include these fields.

## Step 7 — Update vault services (8 services)

Each vault service currently calls `folderAclsRepo.hasAccessToFolder()`. Replace with `folderAclsRepo.getPermissionsForFolder()` and check the specific flag.

**Pattern — before:**
```typescript
const hasAccess = await folderAclsRepo.hasAccessToFolder(db, folderId, userId);
if (!hasAccess) throw new HttpError(403, "Access denied");
```

**Pattern — after:**
```typescript
const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, userId);
if (!permissions || !permissions.<FLAG>) throw new HttpError(403, "Access denied");
```

| Service file | Flag to check |
|---|---|
| `services/vaults/presignVault/index.ts` | `canAdd` |
| `services/vaults/createVault/index.ts` | `canAdd` |
| `services/vaults/getVault/index.ts` | `canView` |
| `services/vaults/getVaultDownloadUrl/index.ts` | `canDownload` |
| `services/vaults/getVaultThumbnailUrl/index.ts` | `canView` |
| `services/vaults/deleteVault/index.ts` | `canDelete` |
| `services/vaults/moveVault/index.ts` | Source: `canDelete`, Target: `canAdd` |
| `services/vaults/getVaultsByFolder/index.ts` | No change needed — listing uses repo-level access filtering. Add permissions to response (see Step 12). |

For `moveVault`: two permission checks — `canDelete` on source folder, `canAdd` on target folder. Both use `getPermissionsForFolder`. The root-level (no folder) check remains unchanged (workspace membership check).

## Step 8 — Update folder services (5 services)

These services use `foldersRepo.findByIdAndUserId()` for access check, which returns the folder or null. Keep that call (it returns folder data). Add a separate `getPermissionsForFolder` call to check specific flags.

**Pattern — after:**
```typescript
const folder = await foldersRepo.findByIdAndUserId(db, folderId, userId);
if (!folder) throw new HttpError(404, "Folder not found");

// ADD: specific permission check
const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, userId);
if (!permissions || !permissions.<FLAG>) throw new HttpError(403, "Access denied");
```

| Service file | Flag to check | Notes |
|---|---|---|
| `services/folders/createFolder/index.ts` | `canAdd` on parent | Only check when `parentFolderId` is provided AND user is not admin. Replace `hasAccessToFolder` call with `getPermissionsForFolder`. |
| `services/folders/deleteFolder/index.ts` | `canDelete` | Check after `findByIdAndUserId`. |
| `services/folders/moveFolder/index.ts` | Source: `canDelete`, Target: `canAdd` | Two checks. Source uses `findByIdAndUserId` (already done) + `getPermissionsForFolder`. Target: replace `findByIdAndUserId` with `getPermissionsForFolder` (we don't need target folder data). |
| `services/folders/getFolder/index.ts` | No flag check needed | All roles have `canView`. Just add permissions to response (Step 12). |
| `services/folders/getBreadcrumbs/index.ts` | No change | Breadcrumbs don't need permission enforcement. |

## Step 9 — Update ACL services (3 services)

### 9a — createFolderAcl

**File:** `services/folders/createFolderAcl/index.ts`

After verifying folder access, add permission check:

```typescript
const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, requestingUserId);
if (!permissions || !permissions.canManageMembers) {
  throw new HttpError(403, "Access denied");
}
```

Accept the optional `role` from the request body and apply permissions:

```typescript
import { FOLDER_ROLE_PERMISSIONS } from "@tayemno/shared";

const rolePermissions = FOLDER_ROLE_PERMISSIONS[data.role ?? "editor"];
const acl = await folderAclsRepo.create(db, {
  folderId,
  userId: data.userId,
  encryptedFolderKey: data.encryptedFolderKey,
  ...rolePermissions,
});
```

If `data.role === "manager"`, verify the requesting user is a workspace admin/owner:

```typescript
if (data.role === "manager") {
  // getPermissionsForFolder returns ALL_PERMISSIONS for admin — canManageMembers is true.
  // But we need to check the actual workspace role, not just folder permission.
  const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(db, folder.workspaceId, requestingUserId);
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new HttpError(403, "Only admins can assign Manager role");
  }
}
```

Note: `folder.workspaceId` comes from the `findByIdAndUserId` call earlier in the function.

### 9b — deleteFolderAcl

**File:** `services/folders/deleteFolderAcl/index.ts`

Add permission check:

```typescript
const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, requestingUserId);
if (!permissions || !permissions.canManageMembers) {
  throw new HttpError(403, "Access denied");
}
```

If the target user is a Manager, only admin can remove them:

```typescript
const targetPermissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, targetUserId);
if (targetPermissions?.canManageMembers) {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);
  const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(db, folder!.workspaceId, requestingUserId);
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new HttpError(403, "Only admins can remove Managers");
  }
}
```

### 9c — bulkCreateFolderAcl

**File:** `services/folders/bulkCreateFolderAcl/index.ts`

Replace the implicit admin-only authorization (which comes from the route preHandler) with service-level permission check:

```typescript
const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, requestingUserId);
if (!permissions || !permissions.canManageMembers) {
  throw new HttpError(403, "Access denied");
}
```

When building ACL objects for bulk insert, apply role-based permissions. The request body items have optional `role`:

```typescript
const rows = await folderAclsRepo.bulkCreate(
  db,
  newAcls.map((acl) => ({
    folderId,
    userId: acl.userId,
    encryptedFolderKey: acl.encryptedFolderKey,
    ...FOLDER_ROLE_PERMISSIONS[acl.role ?? "editor"],
  })),
);
```

If any item has `role === "manager"`, verify requesting user is workspace admin (same check as 9a).

**Route change:** Remove `{ preHandler: [authorizeAdmin] }` from `routes/folders/bulkCreateFolderAcl/index.ts:15`. The service now handles authorization.

## Step 10 — Update `listFolderMembers` to return role

**File:** `services/folders/listFolderMembers/index.ts`

The repo function `findAllByFolderIdWithAncestors` now returns permission flags (Step 6). Map them to role:

```typescript
import { getFolderRoleFromPermissions } from "@tayemno/shared";

// In the members mapping:
role: getFolderRoleFromPermissions({
  canView: row.canView,
  canDownload: row.canDownload,
  canAdd: row.canAdd,
  canEdit: row.canEdit,
  canDelete: row.canDelete,
  canManageMembers: row.canManageMembers,
}),
```

## Step 11 — Return permissions in folder/vault list responses

### 11a — getFolder

**File:** `services/folders/getFolder/index.ts`

After fetching the folder, also fetch permissions:

```typescript
const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, userId);
return { folder: { ...mappedFolder }, permissions: permissions! };
```

`permissions` cannot be null here because `findByIdAndUserId` already verified access.

### 11b — getFoldersByParent

**File:** `services/folders/getFoldersByParent/index.ts`

The service already fetches the workspace member record. Use it to determine root permissions, or call `getPermissionsForFolder` for non-root:

```typescript
let permissions: IFolderPermissions;
if (parentFolderId) {
  permissions = (await folderAclsRepo.getPermissionsForFolder(db, parentFolderId, userId))!;
} else {
  const isAdmin = member.role === "owner" || member.role === "admin";
  permissions = isAdmin
    ? ALL_PERMISSIONS
    : { canView: true, canDownload: true, canAdd: true, canEdit: true, canDelete: true, canManageMembers: false };
}

return { folders: mappedFolders, permissions };
```

Import `ALL_PERMISSIONS` from the folderAcls repo, or define a local constant. Either way is fine — follow the pattern you find cleanest.

### 11c — getVaultsByFolder

**File:** `services/vaults/getVaultsByFolder/index.ts`

Same pattern as 11b — resolve permissions for the folder (or root) and include in response.

### 11d — getAllFolders

**File:** `services/folders/getAllFolders/index.ts`

This already returns `{ folders, acls }`. The ACL objects now include permission flags automatically because `folderAcls.$inferSelect` includes the new columns and `FolderAcl` type was updated. No code changes needed beyond verifying the ACL fields are included in the select query of `findByUserIdAndWorkspaceId`.

**File:** `packages/backend/src/repositories/folderAcls/index.ts`, function `findByUserIdAndWorkspaceId` (lines 93-115).

Currently it selects specific fields. Add the six permission columns:

```typescript
.select({
  id: folderAcls.id,
  folderId: folderAcls.folderId,
  userId: folderAcls.userId,
  encryptedFolderKey: folderAcls.encryptedFolderKey,
  canView: folderAcls.canView,
  canDownload: folderAcls.canDownload,
  canAdd: folderAcls.canAdd,
  canEdit: folderAcls.canEdit,
  canDelete: folderAcls.canDelete,
  canManageMembers: folderAcls.canManageMembers,
  createdAt: folderAcls.createdAt,
  updatedAt: folderAcls.updatedAt,
})
```

## Step 12 — New `updateFolderAclRole` endpoint

### 12a — Service

**New file:** `packages/backend/src/services/folders/updateFolderAclRole/index.ts`

Follow the pattern of `createFolderAcl` service (same file structure, imports, error handling).

```typescript
import type { IUpdateFolderAclRoleRequest, IUpdateFolderAclRoleResponse } from "@tayemno/shared";
import { FOLDER_ROLE_PERMISSIONS } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/HttpError";

export const updateFolderAclRole = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  targetUserId: string,
  data: IUpdateFolderAclRoleRequest,
): Promise<IUpdateFolderAclRoleResponse> => {
  // 1. Verify requesting user has access to folder
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);
  if (!folder) throw new HttpError(404, "Folder not found");

  // 2. Check canManageMembers
  const permissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, requestingUserId);
  if (!permissions || !permissions.canManageMembers) {
    throw new HttpError(403, "Access denied");
  }

  // 3. If assigning Manager, must be workspace admin
  if (data.role === "manager") {
    const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(db, folder.workspaceId, requestingUserId);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "Only admins can assign Manager role");
    }
  }

  // 4. If target is currently Manager, must be workspace admin to change
  const targetPermissions = await folderAclsRepo.getPermissionsForFolder(db, folderId, targetUserId);
  if (targetPermissions?.canManageMembers) {
    const member = await workspaceMembersRepo.findByWorkspaceIdAndUserId(db, folder.workspaceId, requestingUserId);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "Only admins can change Manager role");
    }
  }

  // 5. Verify target has direct ACL on this folder
  const existingAcl = await folderAclsRepo.findByFolderIdAndUserId(db, folderId, targetUserId);
  if (!existingAcl) throw new HttpError(404, "Member has no direct access to this folder");

  // 6. Update permissions
  const rolePermissions = FOLDER_ROLE_PERMISSIONS[data.role];
  await folderAclsRepo.updatePermissions(db, folderId, targetUserId, rolePermissions);

  return { message: "Role updated" };
};
```

### 12b — Route

**New file:** `packages/backend/src/routes/folders/updateFolderAclRole/index.ts`

Follow the pattern of `deleteFolderAcl` route (same structure):

```typescript
import type { FastifyInstance } from "fastify";
import type { IUpdateFolderAclRoleRequest, IUpdateFolderAclRoleResponse } from "@tayemno/shared";
import { updateFolderAclRole } from "../../../services/folders";

export const updateFolderAclRoleRoute = async (app: FastifyInstance) => {
  app.patch<{
    Params: { folderId: string; userId: string };
    Body: IUpdateFolderAclRoleRequest;
  }>("/:folderId/acl/:userId/role", async (request, reply): Promise<IUpdateFolderAclRoleResponse> => {
    const result = await updateFolderAclRole(
      app.db,
      request.user.sub,
      request.params.folderId,
      request.params.userId,
      request.body,
    );
    reply.code(200);
    return result;
  });
};
```

### 12c — Register the route

**File:** `packages/backend/src/routes/folders/index.ts`

Add import and registration alongside the existing routes.

### 12d — Export from services index

**File:** `packages/backend/src/services/folders/index.ts`

Add `export { updateFolderAclRole } from "./updateFolderAclRole";`

## Step 13 — Remove `authorizeAdmin` from `bulkCreateFolderAcl` route

**File:** `packages/backend/src/routes/folders/bulkCreateFolderAcl/index.ts`

```typescript
// BEFORE (line 15):
  app.post<{ ... }>("/:folderId/acl/bulk", { preHandler: [authorizeAdmin] }, async (request, reply) => {

// AFTER:
  app.post<{ ... }>("/:folderId/acl/bulk", async (request, reply) => {
```

Remove the `authorizeAdmin` import if it becomes unused in this file.

## Step 14 — Add `FOLDER_ACL_ROLE_CHANGED` audit action

Already done in Step 3g. Verify it compiles.

---

## Checklist before marking complete

- [ ] Migration generated and looks correct (6 ALTER TABLE ADD COLUMN statements)
- [ ] `npm run build -w packages/backend` succeeds
- [ ] `npm run build -w packages/shared` succeeds
- [ ] `npm run build -w packages/frontend` succeeds (shared type changes are backward-compatible)
- [ ] All new/modified files follow existing patterns (imports, error handling, return types)
- [ ] `getPermissionsForFolder` returns `ALL_PERMISSIONS` for admin/owner
- [ ] `getPermissionsForFolder` returns `null` for non-members and members without ACL
- [ ] `getPermissionsForFolder` returns nearest ancestor ACL permissions for regular members
- [ ] `hasAccessToFolder` is NOT deleted (kept for compatibility)
- [ ] `authorizeAdmin` removed from `bulkCreateFolderAcl` route
- [ ] New `updateFolderAclRole` route registered
