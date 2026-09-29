# Phase 1: Backend — Schema + Nested Folders + Root Vaults

**Size:** ~8 modified files across backend + shared. No frontend changes.

**Why this approach is sufficient:** This phase adds the `parentFolderId` column, teaches the backend to filter folders by parent, and adds a root-level vault query. It does NOT touch the frontend, breadcrumbs, or upload flow — that's Phase 2. Don't add new endpoints beyond what's listed, don't refactor existing encryption logic, don't add folder membership management.

## Steps

### 1. Add `parentFolderId` to shared types

**File:** `packages/shared/src/index.ts`

Add `parentFolderId` to `Folder` interface (after `workspaceId`, line 77):

Before:
```ts
export interface Folder {
  id: string;
  workspaceId: string;
  name: string;
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
  name: string;
  encryptedSymmetricKey: string;
  createdAt: string;
  updatedAt: string;
}
```

Add `parentFolderId` to `NewFolder` interface (after `workspaceId`, line 85):

Before:
```ts
export interface NewFolder {
  workspaceId: string;
  name: string;
  encryptedSymmetricKey: string;
}
```

After:
```ts
export interface NewFolder {
  workspaceId: string;
  parentFolderId?: string | null;
  name: string;
  encryptedSymmetricKey: string;
}
```

Add `parentFolderId` to `ICreateFolderRequest` (line 240):

Before:
```ts
export interface ICreateFolderRequest {
  name: string;
  encryptedSymmetricKey: string;
  memberEncryptedSymmetricKey: string;
}
```

After:
```ts
export interface ICreateFolderRequest {
  name: string;
  encryptedSymmetricKey: string;
  memberEncryptedSymmetricKey: string;
  parentFolderId?: string | null;
}
```

Add new `IGetFoldersRequest` interface (before `IGetVaultsRequest`, line 283):

```ts
export interface IGetFoldersRequest {
  parentFolderId?: string;
}
```

Make `IGetVaultsRequest.folderId` optional and add `workspaceId`:

Before:
```ts
export interface IGetVaultsRequest {
  folderId: string;
}
```

After:
```ts
export interface IGetVaultsRequest {
  folderId?: string;
  workspaceId?: string;
}
```

### 2. Add `parentFolderId` column to schema

**File:** `packages/backend/src/db/schema.ts`

Add after `workspaceId` in the `folders` table (line 124):

Before:
```ts
export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
```

After:
```ts
export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  parentFolderId: uuid("parent_folder_id"),

  name: varchar("name", { length: 255 }).notNull(),
```

Note: The FK reference `references(() => folders.id, { onDelete: "cascade" })` would create a circular reference at definition time in Drizzle. Use a bare `uuid()` column without inline `.references()`. The FK constraint will be added via the migration SQL manually or via Drizzle's table callback. Check if Drizzle supports self-referencing FKs in the table callback — if not, the bare column is sufficient and the FK can be added as a raw SQL migration step.

**After editing schema:** Run `npx drizzle-kit generate` in `packages/backend` to create the migration, then `npx drizzle-kit push` to apply to dev DB.

### 3. Update folders repository — filter by `parentFolderId`

**File:** `packages/backend/src/repositories/folders/index.ts`

Add `isNull` to the drizzle-orm import (line 1):

Before:
```ts
import { eq, and, asc, sql } from "drizzle-orm";
```

After:
```ts
import { eq, and, asc, sql, isNull } from "drizzle-orm";
```

Add `parentFolderId` parameter and filter to `findByWorkspaceIdAndUserId`:

Before:
```ts
export const findByWorkspaceIdAndUserId = async (
  db: Database,
  workspaceId: string,
  userId: string,
) => {
  return db
    .select({
      id: folders.id,
      workspaceId: folders.workspaceId,
      name: folders.name,
      encryptedSymmetricKey: folderMembers.encryptedSymmetricKey,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt,
    })
    .from(folderMembers)
    .innerJoin(folders, eq(folderMembers.folderId, folders.id))
    .where(
      and(
        eq(folders.workspaceId, workspaceId),
        eq(folderMembers.userId, userId),
      ),
    )
```

After:
```ts
export const findByWorkspaceIdAndUserId = async (
  db: Database,
  workspaceId: string,
  userId: string,
  parentFolderId?: string | null,
) => {
  const parentFilter =
    parentFolderId != null
      ? eq(folders.parentFolderId, parentFolderId)
      : isNull(folders.parentFolderId);

  return db
    .select({
      id: folders.id,
      workspaceId: folders.workspaceId,
      parentFolderId: folders.parentFolderId,
      name: folders.name,
      encryptedSymmetricKey: folderMembers.encryptedSymmetricKey,
      createdAt: folders.createdAt,
      updatedAt: folders.updatedAt,
    })
    .from(folderMembers)
    .innerJoin(folders, eq(folderMembers.folderId, folders.id))
    .where(
      and(
        eq(folders.workspaceId, workspaceId),
        eq(folderMembers.userId, userId),
        parentFilter,
      ),
    )
```

Logic:
- `parentFolderId` is `undefined` or `null` (default when query param not passed) → `IS NULL` filter → root folders.
- `parentFolderId` is a UUID string → `eq` filter → children of that folder.

Also add `parentFolderId` to the select clause so the frontend `Folder` type is satisfied.

### 4. Update getFolders service — pass `parentFolderId`

**File:** `packages/backend/src/services/folders/getFolders/index.ts`

Before:
```ts
export const getFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetFoldersResponse> => {
```

After:
```ts
export const getFolders = async (
  db: Database,
  userId: string,
  workspaceId: string,
  parentFolderId?: string | null,
): Promise<IGetFoldersResponse> => {
```

Update the call to the repository (line 22):

Before:
```ts
  const rows = await findByWorkspaceIdAndUserId(db, workspaceId, userId);
```

After:
```ts
  const rows = await findByWorkspaceIdAndUserId(db, workspaceId, userId, parentFolderId);
```

### 5. Update getFolders route — read `parentFolderId` from query string

**File:** `packages/backend/src/routes/folders/getFolders/index.ts`

Before:
```ts
import type { FastifyInstance } from "fastify";
import type { IGetFoldersResponse } from "@tayemno/shared";
import { getFolders } from "../../../services/folders";

export const getFoldersRoute = async (app: FastifyInstance) => {
  app.get<{ Params: { workspaceId: string } }>(
    "/",
    async (request, reply): Promise<IGetFoldersResponse> => {
      try {
        return await getFolders(
          app.db,
          request.user.sub,
          request.params.workspaceId,
        );
```

After:
```ts
import type { FastifyInstance } from "fastify";
import type { IGetFoldersRequest, IGetFoldersResponse } from "@tayemno/shared";
import { getFolders } from "../../../services/folders";

export const getFoldersRoute = async (app: FastifyInstance) => {
  app.get<{ Params: { workspaceId: string }; Querystring: IGetFoldersRequest }>(
    "/",
    async (request, reply): Promise<IGetFoldersResponse> => {
      try {
        const parentFolderId = request.query.parentFolderId ?? null;

        return await getFolders(
          app.db,
          request.user.sub,
          request.params.workspaceId,
          parentFolderId,
        );
```

When no `parentFolderId` query param is provided, Fastify gives `undefined`, which `?? null` converts to `null`, which the repo interprets as "root folders (IS NULL)". When the param is a UUID string, it passes through to the repo for `eq` filtering.

### 6. Update createFolder service — support `parentFolderId`

**File:** `packages/backend/src/services/folders/createFolder/index.ts`

Add parent folder membership check and pass `parentFolderId` to insert.

Before:
```ts
  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const folder = await insertFolder(db, {
    workspaceId,
    name: data.name,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
  });
```

After:
```ts
  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  if (data.parentFolderId) {
    const parentMembership = await folderMembersRepo.findByFolderIdAndUserId(
      db,
      data.parentFolderId,
      userId,
    );

    if (!parentMembership) {
      throw new HttpError(403, "Access denied to parent folder");
    }
  }

  const folder = await insertFolder(db, {
    workspaceId,
    name: data.name,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
    parentFolderId: data.parentFolderId ?? null,
  });
```

Note: `folderMembersRepo` is already imported at line 8 of the existing file.

### 7. Add root-level vault query to vaults repository

**File:** `packages/backend/src/repositories/vaults/index.ts`

Add `and` and `isNull` to the drizzle-orm import.

Before:
```ts
import { eq, asc, sql } from "drizzle-orm";
```

After:
```ts
import { eq, and, asc, sql, isNull } from "drizzle-orm";
```

Extract the natural sort to a shared constant to avoid duplication, then add `findByWorkspaceIdRootLevel`:

Before:
```ts
export const findByFolderId = async (db: Database, folderId: string) => {
  return db
    .select()
    .from(vaults)
    .where(eq(vaults.folderId, folderId))
    .orderBy(
      asc(sql`regexp_replace(lower(${vaults.name}), '\\d', '', 'g')`),
      asc(
        sql`COALESCE(NULLIF(regexp_replace(${vaults.name}, '\\D', '', 'g'), ''), '0')::bigint`,
      ),
    );
};
```

After:
```ts
const naturalSort = [
  asc(sql`regexp_replace(lower(${vaults.name}), '\\d', '', 'g')`),
  asc(
    sql`COALESCE(NULLIF(regexp_replace(${vaults.name}, '\\D', '', 'g'), ''), '0')::bigint`,
  ),
] as const;

export const findByFolderId = async (db: Database, folderId: string) => {
  return db
    .select()
    .from(vaults)
    .where(eq(vaults.folderId, folderId))
    .orderBy(...naturalSort);
};

export const findByWorkspaceIdRootLevel = async (
  db: Database,
  workspaceId: string,
) => {
  return db
    .select()
    .from(vaults)
    .where(and(eq(vaults.workspaceId, workspaceId), isNull(vaults.folderId)))
    .orderBy(...naturalSort);
};
```

### 8. Update getVaults service — handle missing `folderId`

**File:** `packages/backend/src/services/vaults/getVaults/index.ts`

Before:
```ts
import type { Database } from "../../../db";
import type { IGetVaultsResponse } from "@tayemno/shared";
import { findByFolderId } from "../../../repositories/vaults";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import { HttpError } from "../../../utils/httpError";

export const getVaults = async (
  db: Database,
  userId: string,
  folderId: string,
): Promise<IGetVaultsResponse> => {
  const membership = await folderMembersRepo.findByFolderIdAndUserId(
    db,
    folderId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await findByFolderId(db, folderId);

  return {
    vaults: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
};
```

After:
```ts
import type { Database } from "../../../db";
import type { IGetVaultsResponse } from "@tayemno/shared";
import { findByFolderId, findByWorkspaceIdRootLevel } from "../../../repositories/vaults";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const getVaults = async (
  db: Database,
  userId: string,
  folderId?: string,
  workspaceId?: string,
): Promise<IGetVaultsResponse> => {
  let rows;

  if (folderId) {
    const membership = await folderMembersRepo.findByFolderIdAndUserId(
      db,
      folderId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "Access denied");
    }

    rows = await findByFolderId(db, folderId);
  } else if (workspaceId) {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "Access denied");
    }

    rows = await findByWorkspaceIdRootLevel(db, workspaceId);
  } else {
    throw new HttpError(400, "Either folderId or workspaceId is required");
  }

  return {
    vaults: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
};
```

### 9. Update getVaults route — pass both optional params

**File:** `packages/backend/src/routes/vaults/getVaults/index.ts`

Before:
```ts
        return await getVaults(
          app.db,
          request.user.sub,
          request.query.folderId,
        );
```

After:
```ts
        return await getVaults(
          app.db,
          request.user.sub,
          request.query.folderId,
          request.query.workspaceId,
        );
```

### 10. Generate migration and verify

```bash
cd packages/backend && npx drizzle-kit generate
cd packages/backend && npx drizzle-kit push
cd packages/backend && npx tsc --build
cd packages/shared && npx tsc --build
```

Expected files in the diff:

- `packages/shared/src/index.ts` (modified)
- `packages/backend/src/db/schema.ts` (modified)
- `packages/backend/src/repositories/folders/index.ts` (modified)
- `packages/backend/src/repositories/vaults/index.ts` (modified)
- `packages/backend/src/services/folders/getFolders/index.ts` (modified)
- `packages/backend/src/services/folders/createFolder/index.ts` (modified)
- `packages/backend/src/services/vaults/getVaults/index.ts` (modified)
- `packages/backend/src/routes/folders/getFolders/index.ts` (modified)
- `packages/backend/src/routes/vaults/getVaults/index.ts` (modified)
- `packages/backend/src/db/migrations/` (new migration file)

Nothing in `packages/frontend/` should be touched.
