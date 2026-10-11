# Phase 1 -- Schema + Backend

**Size**: ~15 modified files, ~7 new files. Large phase -- covers schema changes, shared type updates, all backend repositories/services/routes for the new key wrapping model, plus new moveFolder and ACL CRUD endpoints.

**Why this approach is sufficient -- don't add anything beyond this**: This phase establishes the data layer and API surface. No frontend changes, no crypto utilities, no UI. The frontend will break after this phase until Phase 2 updates it. That's fine -- there's no production traffic. The goal is a complete, tested backend that serves the new Folder/ACL data shapes. Do NOT add any frontend code, React hooks, or client-side crypto in this phase.

## Steps

### 1. Update Drizzle schema -- `packages/backend/src/db/schema.ts`

**1a. Modify `folders` table** (lines 120-138):

Add two new nullable columns after `encryptedSymmetricKey`:

Before:
```ts
export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  parentFolderId: uuid("parent_folder_id"),

  encryptedName: text("encrypted_name").notNull(),
  nameNonce: text("name_nonce").notNull(),
  encryptedSymmetricKey: text("encrypted_symmetric_key").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
```

After:
```ts
export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  parentFolderId: uuid("parent_folder_id"),

  encryptedName: text("encrypted_name").notNull(),
  nameNonce: text("name_nonce").notNull(),
  encryptedSymmetricKey: text("encrypted_symmetric_key").notNull(),
  wrappedKey: text("wrapped_key"),
  wrappedKeyNonce: text("wrapped_key_nonce"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
```

`wrappedKey` is null for root folders (no parent). For non-root folders, it holds `SymmetricCrypto.encrypt(folderKey, parentFolderKey).ciphertext`.
`wrappedKeyNonce` is null for root folders. For non-root folders, it holds the nonce from that encryption.

**1b. Replace `folderMembers` table** (lines 140-160) with `folderAcls`:

Before:
```ts
export const folderMembers = pgTable(
  "folder_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedSymmetricKey: text("encrypted_symmetric_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique().on(t.folderId, t.userId)],
);
```

After:
```ts
export const folderAcls = pgTable(
  "folder_acls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedFolderKey: text("encrypted_folder_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique().on(t.folderId, t.userId)],
);
```

Key difference: column name `encrypted_symmetric_key` -> `encrypted_folder_key` for clarity. Export name `folderMembers` -> `folderAcls`.

**1c. Update all imports of `folderMembers`** from `schema.ts`:
- `repositories/folders/index.ts:3` -- change `folderMembers` to `folderAcls`
- `repositories/folderMembers/index.ts:3` -- this file is being replaced (step 3)

### 2. Update shared types -- `packages/shared/src/index.ts`

**2a. Update `Folder` interface** (lines 75-84):

Before:
```ts
export interface Folder {
  id: string;
  workspaceId: string;
  parentFolderId: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  createdAt: string;
  updatedAt: string;
}
```

After:
```ts
export interface Folder {
  id: string;
  workspaceId: string;
  parentFolderId: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  wrappedKey: string | null;
  wrappedKeyNonce: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**2b. Update `NewFolder` interface** (lines 86-92):

Before:
```ts
export interface NewFolder {
  workspaceId: string;
  parentFolderId?: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
}
```

After:
```ts
export interface NewFolder {
  workspaceId: string;
  parentFolderId?: string | null;
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  wrappedKey?: string | null;
  wrappedKeyNonce?: string | null;
}
```

**2c. Replace `FolderMember` / `NewFolderMember`** (lines 94-107):

Before:
```ts
export interface FolderMember {
  id: string;
  folderId: string;
  userId: string;
  encryptedSymmetricKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewFolderMember {
  folderId: string;
  userId: string;
  encryptedSymmetricKey: string;
}
```

After:
```ts
export interface FolderAcl {
  id: string;
  folderId: string;
  userId: string;
  encryptedFolderKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewFolderAcl {
  folderId: string;
  userId: string;
  encryptedFolderKey: string;
}
```

**2d. Update `ICreateFolderRequest`** (lines 246-252):

Before:
```ts
export interface ICreateFolderRequest {
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  memberEncryptedSymmetricKey: string;
  parentFolderId?: string | null;
}
```

After:
```ts
export interface ICreateFolderRequest {
  encryptedName: string;
  nameNonce: string;
  encryptedSymmetricKey: string;
  wrappedKey: string | null;
  wrappedKeyNonce: string | null;
  aclEncryptedFolderKey: string;
  parentFolderId?: string | null;
}
```

**2e. Update `IGetAllFoldersResponse`** (lines 308-310):

Before:
```ts
export interface IGetAllFoldersResponse {
  folders: Folder[];
}
```

After:
```ts
export interface IGetAllFoldersResponse {
  folders: Folder[];
  acls: FolderAcl[];
}
```

**2f. Add new request/response interfaces** (after existing interfaces):

```ts
export interface IMoveFolderRequest {
  newParentFolderId: string | null;
  wrappedKey: string | null;
  wrappedKeyNonce: string | null;
  encryptedSymmetricKey: string;
}

export interface IMoveFolderResponse {
  folder: Folder;
}

export interface ICreateFolderAclRequest {
  userId: string;
  encryptedFolderKey: string;
}

export interface ICreateFolderAclResponse {
  acl: FolderAcl;
}

export interface IDeleteFolderAclResponse {
  message: string;
}
```

### 3. Create `folderAcls` repository -- `packages/backend/src/repositories/folderAcls/index.ts`

New file. Copy pattern from existing `repositories/folderMembers/index.ts` but with the new table and column names.

```ts
import { eq, and } from "drizzle-orm";
import type { Database } from "../../db";
import { folderAcls } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof folderAcls.$inferInsert,
) => {
  const result = await db.insert(folderAcls).values(data).returning();
  return result[0];
};

export const findByFolderIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const result = await db
    .select()
    .from(folderAcls)
    .where(
      and(
        eq(folderAcls.folderId, folderId),
        eq(folderAcls.userId, userId),
      ),
    )
    .limit(1);

  return result[0];
};

export const findByUserId = async (
  db: Database,
  userId: string,
) => {
  return db
    .select()
    .from(folderAcls)
    .where(eq(folderAcls.userId, userId));
};

export const deleteByFolderIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  await db
    .delete(folderAcls)
    .where(
      and(
        eq(folderAcls.folderId, folderId),
        eq(folderAcls.userId, userId),
      ),
    );
};
```

### 4. Delete old `folderMembers` repository

Delete `packages/backend/src/repositories/folderMembers/index.ts`. All references will be updated to use `folderAcls`.

### 5. Update `folders` repository -- `packages/backend/src/repositories/folders/index.ts`

All queries currently JOIN with `folderMembers` and return `folderMembers.encryptedSymmetricKey`. In the new model, queries return the folder's own fields (including `wrappedKey`, `wrappedKeyNonce`, and `encryptedSymmetricKey` from the `folders` table itself).

Access control changes from "user has folder_members entry for this exact folder" to "user is admin/owner OR user has folder_acls entry for this folder or an ancestor."

**5a. Replace `findByIdAndUserId`** (lines 5-27):

The new query checks access via workspace role (admin/owner) OR ACL entry (on the folder or any ancestor), and returns the folder's own columns:

```ts
export const findByIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const rows = await db.execute(sql`
    SELECT f.id, f.workspace_id AS "workspaceId", f.parent_folder_id AS "parentFolderId",
           f.encrypted_name AS "encryptedName", f.name_nonce AS "nameNonce",
           f.encrypted_symmetric_key AS "encryptedSymmetricKey",
           f.wrapped_key AS "wrappedKey", f.wrapped_key_nonce AS "wrappedKeyNonce",
           f.created_at AS "createdAt", f.updated_at AS "updatedAt"
    FROM folders f
    WHERE f.id = ${folderId}
    AND (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = f.workspace_id AND wm.user_id = ${userId}
        AND wm.role IN ('owner', 'admin')
      )
      OR EXISTS (
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_folder_id FROM folders WHERE id = ${folderId}
          UNION ALL
          SELECT fp.id, fp.parent_folder_id FROM folders fp
          INNER JOIN ancestors a ON fp.id = a.parent_folder_id
        )
        SELECT 1 FROM folder_acls fa
        WHERE fa.folder_id IN (SELECT id FROM ancestors) AND fa.user_id = ${userId}
      )
    )
  `);
  return (rows as unknown as any[])[0] ?? null;
};
```

**5b. Replace `findByWorkspaceIdAndUserId`** (lines 37-65):

For admin/owner: return all children of `parentFolderId`.
For members: return only children in accessible subtrees.

```ts
export const findByWorkspaceIdAndUserId = async (
  db: Database,
  workspaceId: string,
  userId: string,
  parentFolderId: string | null,
) => {
  const parentCondition = parentFolderId != null
    ? sql`f.parent_folder_id = ${parentFolderId}`
    : sql`f.parent_folder_id IS NULL`;

  const rows = await db.execute(sql`
    WITH RECURSIVE accessible AS (
      SELECT fa_f.id FROM folders fa_f
      INNER JOIN folder_acls fa ON fa.folder_id = fa_f.id
      WHERE fa.user_id = ${userId} AND fa_f.workspace_id = ${workspaceId}
      UNION ALL
      SELECT child.id FROM folders child
      INNER JOIN accessible a ON child.parent_folder_id = a.id
    )
    SELECT f.id, f.workspace_id AS "workspaceId", f.parent_folder_id AS "parentFolderId",
           f.encrypted_name AS "encryptedName", f.name_nonce AS "nameNonce",
           f.encrypted_symmetric_key AS "encryptedSymmetricKey",
           f.wrapped_key AS "wrappedKey", f.wrapped_key_nonce AS "wrappedKeyNonce",
           f.created_at AS "createdAt", f.updated_at AS "updatedAt"
    FROM folders f
    WHERE f.workspace_id = ${workspaceId}
    AND ${parentCondition}
    AND (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${userId}
        AND wm.role IN ('owner', 'admin')
      )
      OR f.id IN (SELECT id FROM accessible)
    )
  `);
  return rows as unknown as any[];
};
```

**5c. Replace `findAllByUser`** (lines 146-170):

For admin/owner: return ALL workspace folders.
For members: return ACL-granted folders + all their descendants.

```ts
export const findAllByUser = async (
  db: Database,
  workspaceId: string,
  userId: string,
) => {
  const rows = await db.execute(sql`
    WITH RECURSIVE accessible AS (
      SELECT fa_f.id FROM folders fa_f
      INNER JOIN folder_acls fa ON fa.folder_id = fa_f.id
      WHERE fa.user_id = ${userId} AND fa_f.workspace_id = ${workspaceId}
      UNION ALL
      SELECT child.id FROM folders child
      INNER JOIN accessible a ON child.parent_folder_id = a.id
    )
    SELECT f.id, f.workspace_id AS "workspaceId", f.parent_folder_id AS "parentFolderId",
           f.encrypted_name AS "encryptedName", f.name_nonce AS "nameNonce",
           f.encrypted_symmetric_key AS "encryptedSymmetricKey",
           f.wrapped_key AS "wrappedKey", f.wrapped_key_nonce AS "wrappedKeyNonce",
           f.created_at AS "createdAt", f.updated_at AS "updatedAt"
    FROM folders f
    WHERE f.workspace_id = ${workspaceId}
    AND (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${userId}
        AND wm.role IN ('owner', 'admin')
      )
      OR f.id IN (SELECT id FROM accessible)
    )
  `);
  return rows as unknown as any[];
};
```

**5d. Replace `findBreadcrumbs`** (lines 108-144):

No longer JOINs with `folder_members`. Returns folder's own fields. Access check uses the same admin-or-ACL pattern:

```ts
export const findBreadcrumbs = async (
  db: Database,
  folderId: string,
  userId: string,
  workspaceId: string,
) => {
  const rows = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT f.id, f.workspace_id, f.parent_folder_id, f.encrypted_name, f.name_nonce,
             f.encrypted_symmetric_key, f.wrapped_key, f.wrapped_key_nonce,
             f.created_at, f.updated_at, 0 AS depth
      FROM folders f
      WHERE f.id = ${folderId}
      UNION ALL
      SELECT f.id, f.workspace_id, f.parent_folder_id, f.encrypted_name, f.name_nonce,
             f.encrypted_symmetric_key, f.wrapped_key, f.wrapped_key_nonce,
             f.created_at, f.updated_at, a.depth + 1
      FROM folders f
      INNER JOIN ancestors a ON f.id = a.parent_folder_id
    )
    SELECT id, workspace_id AS "workspaceId", parent_folder_id AS "parentFolderId",
           encrypted_name AS "encryptedName", name_nonce AS "nameNonce",
           encrypted_symmetric_key AS "encryptedSymmetricKey",
           wrapped_key AS "wrappedKey", wrapped_key_nonce AS "wrappedKeyNonce",
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM ancestors
    ORDER BY depth DESC
  `);
  return rows as unknown as any[];
};
```

Note: `findBreadcrumbs` now takes `workspaceId` as a parameter (needed for access check at the service level, not embedded in the query). The access check is done in the service layer before calling this repo function.

**5e. Add `updateMove` method**:

```ts
export const updateMove = async (
  db: Database,
  folderId: string,
  data: {
    parentFolderId: string | null;
    wrappedKey: string | null;
    wrappedKeyNonce: string | null;
    encryptedSymmetricKey: string;
  },
) => {
  const result = await db
    .update(folders)
    .set({
      parentFolderId: data.parentFolderId,
      wrappedKey: data.wrappedKey,
      wrappedKeyNonce: data.wrappedKeyNonce,
      encryptedSymmetricKey: data.encryptedSymmetricKey,
    })
    .where(eq(folders.id, folderId))
    .returning();

  return result[0] ?? null;
};
```

**5f. Update import**: Change `import { folders, folderMembers }` to `import { folders, folderAcls }` at line 3. Remove `folderMembers` usage. The `folderAcls` import is only needed if any Drizzle query-builder calls reference it; otherwise only `folders` is needed since the complex queries use raw SQL.

**5g. Keep unchanged**: `findDescendantVaultS3Keys`, `findDescendantIds`, `deleteByIds` -- these don't reference `folder_members` and operate purely on the `folders` table.

### 6. Update `folders` services

**6a. Update `createFolder`** -- `packages/backend/src/services/folders/createFolder/index.ts`

Before (key parts):
```ts
import * as folderMembersRepo from "../../../repositories/folderMembers";
// ...
const folder = await insertFolder(db, {
  workspaceId,
  encryptedName: data.encryptedName,
  nameNonce: data.nameNonce,
  encryptedSymmetricKey: data.encryptedSymmetricKey,
  parentFolderId: data.parentFolderId ?? null,
});

const folderMember = await folderMembersRepo.create(db, {
  folderId: folder.id,
  userId,
  encryptedSymmetricKey: data.memberEncryptedSymmetricKey,
});

const folderWithMemberKey = {
  ...folder,
  encryptedSymmetricKey: folderMember.encryptedSymmetricKey,
};

return { folder: mapTimestamps(folderWithMemberKey) };
```

After:
```ts
import * as folderAclsRepo from "../../../repositories/folderAcls";
// ...
const folder = await insertFolder(db, {
  workspaceId,
  encryptedName: data.encryptedName,
  nameNonce: data.nameNonce,
  encryptedSymmetricKey: data.encryptedSymmetricKey,
  wrappedKey: data.wrappedKey ?? null,
  wrappedKeyNonce: data.wrappedKeyNonce ?? null,
  parentFolderId: data.parentFolderId ?? null,
});

await folderAclsRepo.create(db, {
  folderId: folder.id,
  userId,
  encryptedFolderKey: data.aclEncryptedFolderKey,
});

return { folder: mapTimestamps(folder) };
```

The response now returns the folder's own fields (including `encryptedSymmetricKey` from the `folders` table, the admin copy). No more key substitution.

Also update the parent folder access check: change `folderMembersRepo.findByFolderIdAndUserId` to `folderAclsRepo.findByFolderIdAndUserId`. However, the access check should also allow admin/owner users who may not have an ACL entry but can access via role. Add a workspace role check:

```ts
if (data.parentFolderId) {
  const parentAcl = await folderAclsRepo.findByFolderIdAndUserId(
    db,
    data.parentFolderId,
    userId,
  );

  if (!parentAcl && membership.role === "member") {
    throw new HttpError(403, "Access denied to parent folder");
  }
}
```

**6b. Update `getAllFolders`** -- `packages/backend/src/services/folders/getAllFolders/index.ts`

Before:
```ts
export const getAllFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetAllFoldersResponse> => {
  const rows = await foldersRepo.findAllByUser(db, workspaceId, userId);
  return { folders: rows.map(mapTimestamps) };
};
```

After:
```ts
import * as folderAclsRepo from "../../../repositories/folderAcls";

export const getAllFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetAllFoldersResponse> => {
  const rows = await foldersRepo.findAllByUser(db, workspaceId, userId);
  const acls = await folderAclsRepo.findByUserId(db, userId);
  return {
    folders: rows.map(mapTimestamps),
    acls: acls
      .filter((a) => rows.some((r) => r.id === a.folderId))
      .map(mapTimestamps),
  };
};
```

Filter ACLs to only include those for folders in the response (workspace scoping).

**6c. Update `getFoldersByParent`** -- `packages/backend/src/services/folders/getFoldersByParent/index.ts`

Access check stays at workspace level (must be a member). The repository query now handles the admin-vs-ACL filtering. Minimal changes -- just ensure the service passes through correctly.

**6d. Update `getFolder`** -- `packages/backend/src/services/folders/getFolder/index.ts`

No significant change -- `foldersRepo.findByIdAndUserId` already does the access check in the new model.

**6e. Update `getBreadcrumbs`** -- `packages/backend/src/services/folders/getBreadcrumbs/index.ts`

The `findBreadcrumbs` repo method now takes `workspaceId`. Add access check at service level: verify user is workspace member (any role) before calling the repo. The repo method returns all ancestors regardless -- the service layer ensures the user has workspace access.

**6f. Update `deleteFolder`** -- `packages/backend/src/services/folders/deleteFolder/index.ts`

Currently uses `foldersRepo.findByIdAndUserId` (which does the JOIN). The new `findByIdAndUserId` handles admin-or-ACL access. No changes needed beyond what step 5a already handles.

### 7. Create `moveFolder` service -- `packages/backend/src/services/folders/moveFolder/index.ts`

New file. Pattern follows `services/vaults/moveVault/index.ts`.

```ts
import type { IMoveFolderRequest, IMoveFolderResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const moveFolder = async (
  db: Database,
  userId: string,
  folderId: string,
  data: IMoveFolderRequest,
): Promise<IMoveFolderResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, userId);

  if (!folder) {
    throw new HttpError(404, "Folder not found");
  }

  // Verify access to target location
  if (data.newParentFolderId) {
    const targetFolder = await foldersRepo.findByIdAndUserId(
      db,
      data.newParentFolderId,
      userId,
    );
    if (!targetFolder) {
      throw new HttpError(403, "Access denied to target folder");
    }
  } else {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      folder.workspaceId,
      userId,
    );
    if (!membership) {
      throw new HttpError(403, "Access denied");
    }
  }

  // Prevent moving to same parent
  if (folder.parentFolderId === data.newParentFolderId) {
    throw new HttpError(400, "Folder is already in this location");
  }

  // Prevent moving a folder into its own subtree
  if (data.newParentFolderId) {
    const descendantIds = await foldersRepo.findDescendantIds(db, folderId);
    if (descendantIds.includes(data.newParentFolderId)) {
      throw new HttpError(400, "Cannot move a folder into its own subtree");
    }
  }

  const updated = await foldersRepo.updateMove(db, folderId, {
    parentFolderId: data.newParentFolderId,
    wrappedKey: data.wrappedKey,
    wrappedKeyNonce: data.wrappedKeyNonce,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
  });

  if (!updated) {
    throw new HttpError(500, "Failed to move folder");
  }

  return { folder: mapTimestamps(updated) };
};
```

Key guard: prevents circular moves by checking if `newParentFolderId` is in the folder's own descendant set.

### 8. Create ACL CRUD services

**8a. Create `createFolderAcl`** -- `packages/backend/src/services/folders/createFolderAcl/index.ts`

```ts
import type { ICreateFolderAclRequest, ICreateFolderAclResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const createFolderAcl = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  data: ICreateFolderAclRequest,
): Promise<ICreateFolderAclResponse> => {
  // Verify requesting user has access to this folder
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  // Check if ACL already exists
  const existing = await folderAclsRepo.findByFolderIdAndUserId(
    db,
    folderId,
    data.userId,
  );

  if (existing) {
    throw new HttpError(409, "User already has access to this folder");
  }

  const acl = await folderAclsRepo.create(db, {
    folderId,
    userId: data.userId,
    encryptedFolderKey: data.encryptedFolderKey,
  });

  return { acl: mapTimestamps(acl) };
};
```

**8b. Create `deleteFolderAcl`** -- `packages/backend/src/services/folders/deleteFolderAcl/index.ts`

```ts
import type { IDeleteFolderAclResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";

export const deleteFolderAcl = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  targetUserId: string,
): Promise<IDeleteFolderAclResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  await folderAclsRepo.deleteByFolderIdAndUserId(db, folderId, targetUserId);

  return { message: "Access revoked" };
};
```

### 9. Update `folders` service index -- `packages/backend/src/services/folders/index.ts`

Before:
```ts
export { createFolder } from "./createFolder";
export { deleteFolder } from "./deleteFolder";
export { getAllFolders } from "./getAllFolders";
export { getFoldersByParent } from "./getFoldersByParent";
export { getFolder } from "./getFolder";
export { getBreadcrumbs } from "./getBreadcrumbs";
```

After:
```ts
export { createFolder } from "./createFolder";
export { deleteFolder } from "./deleteFolder";
export { getAllFolders } from "./getAllFolders";
export { getFoldersByParent } from "./getFoldersByParent";
export { getFolder } from "./getFolder";
export { getBreadcrumbs } from "./getBreadcrumbs";
export { moveFolder } from "./moveFolder";
export { createFolderAcl } from "./createFolderAcl";
export { deleteFolderAcl } from "./deleteFolderAcl";
```

### 10. Create new routes

**10a. `moveFolder` route** -- `packages/backend/src/routes/folders/moveFolder/index.ts`

Pattern follows `routes/vaults/moveVault/index.ts`:

```ts
import type { FastifyInstance } from "fastify";
import type { IMoveFolderRequest, IMoveFolderResponse } from "@tayemno/shared";
import { moveFolder } from "../../../services/folders";

export const moveFolderRoute = async (app: FastifyInstance) => {
  app.patch<{
    Params: { folderId: string };
    Body: IMoveFolderRequest;
  }>("/:folderId/move", async (request, reply): Promise<IMoveFolderResponse> => {
    try {
      return await moveFolder(
        app.db,
        request.user.sub,
        request.params.folderId,
        request.body,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

**10b. `createFolderAcl` route** -- `packages/backend/src/routes/folders/createFolderAcl/index.ts`

```ts
import type { FastifyInstance } from "fastify";
import type { ICreateFolderAclRequest, ICreateFolderAclResponse } from "@tayemno/shared";
import { createFolderAcl } from "../../../services/folders";

export const createFolderAclRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { folderId: string };
    Body: ICreateFolderAclRequest;
  }>("/:folderId/acl", async (request, reply): Promise<ICreateFolderAclResponse> => {
    try {
      return await createFolderAcl(
        app.db,
        request.user.sub,
        request.params.folderId,
        request.body,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

**10c. `deleteFolderAcl` route** -- `packages/backend/src/routes/folders/deleteFolderAcl/index.ts`

```ts
import type { FastifyInstance } from "fastify";
import type { IDeleteFolderAclResponse } from "@tayemno/shared";
import { deleteFolderAcl } from "../../../services/folders";

export const deleteFolderAclRoute = async (app: FastifyInstance) => {
  app.delete<{
    Params: { folderId: string; userId: string };
  }>("/:folderId/acl/:userId", async (request, reply): Promise<IDeleteFolderAclResponse> => {
    try {
      return await deleteFolderAcl(
        app.db,
        request.user.sub,
        request.params.folderId,
        request.params.userId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

### 11. Register new routes -- `packages/backend/src/routes/folders/index.ts`

Before:
```ts
import { createFolderRoute } from "./createFolder";
import { deleteFolderRoute } from "./deleteFolder";
import { getAllFoldersRoute } from "./getAllFolders";
import { getFoldersByParentRoute } from "./getFoldersByParent";
import { getFolderRoute } from "./getFolder";
import { getBreadcrumbsRoute } from "./getBreadcrumbs";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(getBreadcrumbsRoute);
  await app.register(getAllFoldersRoute);
  await app.register(getFolderRoute);
  await app.register(getFoldersByParentRoute);
  await app.register(createFolderRoute);
  await app.register(deleteFolderRoute);
};
```

After:
```ts
import { createFolderRoute } from "./createFolder";
import { deleteFolderRoute } from "./deleteFolder";
import { getAllFoldersRoute } from "./getAllFolders";
import { getFoldersByParentRoute } from "./getFoldersByParent";
import { getFolderRoute } from "./getFolder";
import { getBreadcrumbsRoute } from "./getBreadcrumbs";
import { moveFolderRoute } from "./moveFolder";
import { createFolderAclRoute } from "./createFolderAcl";
import { deleteFolderAclRoute } from "./deleteFolderAcl";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(getBreadcrumbsRoute);
  await app.register(getAllFoldersRoute);
  await app.register(getFolderRoute);
  await app.register(getFoldersByParentRoute);
  await app.register(createFolderRoute);
  await app.register(deleteFolderRoute);
  await app.register(moveFolderRoute);
  await app.register(createFolderAclRoute);
  await app.register(deleteFolderAclRoute);
};
```

### 12. Update vault services and repository -- `folder_members` -> `folder_acls`

**12a. Update `repositories/vaults/index.ts`**:

All raw SQL references to `folder_members` must change to `folder_acls`, and `fm.encrypted_symmetric_key` references are removed (vault queries don't need the user's folder key).

- Line 86: `FROM folder_members fm WHERE fm.folder_id` -> `FROM folder_acls fa WHERE fa.folder_id`
- Line 86: `fm.user_id` -> `fa.user_id`
- Line 127: `FROM folder_members fm WHERE fm.user_id` -> `FROM folder_acls fa WHERE fa.user_id`

**12b. Update `services/vaults/moveVault/index.ts`** (line 5):

```ts
// Before
import * as folderMembersRepo from "../../../repositories/folderMembers";
// After
import * as folderAclsRepo from "../../../repositories/folderAcls";
```

All `folderMembersRepo.findByFolderIdAndUserId` calls -> `folderAclsRepo.findByFolderIdAndUserId`.

**12c. Update `services/vaults/createVault/index.ts`**: Same import change and function call rename.

**12d. Update `services/vaults/deleteVault/index.ts`**: Same import change and function call rename.

### 13. Push schema

After all code changes, run:

```bash
npm run db:push -w packages/backend
```

This pushes the new schema to the database. No migration file needed (pre-production).

## Verification

```bash
# TypeScript must compile
npx tsc --noEmit -p packages/backend/tsconfig.json

# Schema push must succeed
npm run db:push -w packages/backend

# Check git diff scope
git diff --stat
```

Expected diff scope:
- `packages/backend/src/db/schema.ts` (modified)
- `packages/shared/src/index.ts` (modified)
- `packages/backend/src/repositories/folders/index.ts` (modified)
- `packages/backend/src/repositories/folderMembers/index.ts` (deleted)
- `packages/backend/src/repositories/folderAcls/index.ts` (new)
- `packages/backend/src/repositories/vaults/index.ts` (modified)
- `packages/backend/src/services/folders/createFolder/index.ts` (modified)
- `packages/backend/src/services/folders/deleteFolder/index.ts` (modified, minor)
- `packages/backend/src/services/folders/getAllFolders/index.ts` (modified)
- `packages/backend/src/services/folders/getFoldersByParent/index.ts` (modified)
- `packages/backend/src/services/folders/getFolder/index.ts` (modified, minor)
- `packages/backend/src/services/folders/getBreadcrumbs/index.ts` (modified)
- `packages/backend/src/services/folders/index.ts` (modified)
- `packages/backend/src/services/folders/moveFolder/index.ts` (new)
- `packages/backend/src/services/folders/createFolderAcl/index.ts` (new)
- `packages/backend/src/services/folders/deleteFolderAcl/index.ts` (new)
- `packages/backend/src/routes/folders/index.ts` (modified)
- `packages/backend/src/routes/folders/moveFolder/index.ts` (new)
- `packages/backend/src/routes/folders/createFolderAcl/index.ts` (new)
- `packages/backend/src/routes/folders/deleteFolderAcl/index.ts` (new)
- `packages/backend/src/services/vaults/moveVault/index.ts` (modified)
- `packages/backend/src/services/vaults/createVault/index.ts` (modified)
- `packages/backend/src/services/vaults/deleteVault/index.ts` (modified)

Nothing in `packages/frontend/` should appear.
