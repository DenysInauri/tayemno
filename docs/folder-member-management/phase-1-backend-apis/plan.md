# Phase 1: Backend — Folder Member APIs

**Size**: 3 new files (route + service + repo method), 3 modified files (shared types, services barrel, routes index, repo, workspace members repo+service). Straightforward CRUD following existing patterns.

**Why this approach is sufficient**: The existing `createFolderAcl`/`deleteFolderAcl` pattern establishes the exact shape for new folder ACL endpoints. The `listMembers` service establishes the pattern for listing users with joined data. No new architectural patterns needed — just replicate existing ones.

## Steps

### 1. Add `publicKey` to `IMemberItem` in shared types

**File**: `packages/shared/src/index.ts`

**Before** (lines 388-397):
```typescript
export interface IMemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  adminEncryptedUserPrivateKey: string | null;
  createdAt: string;
}
```

**After**:
```typescript
export interface IMemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  publicKey: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  adminEncryptedUserPrivateKey: string | null;
  createdAt: string;
}
```

### 2. Add `publicKey` to workspace members repository query

**File**: `packages/backend/src/repositories/workspaceMembers/index.ts`

In `findAllByWorkspaceId` (lines 41-58), add `publicKey: users.publicKey` to the select object:

**Before**:
```typescript
.select({
  id: workspaceMembers.id,
  userId: workspaceMembers.userId,
  role: workspaceMembers.role,
  status: workspaceMembers.status,
  adminEncryptedUserPrivateKey: workspaceMembers.adminEncryptedUserPrivateKey,
  createdAt: workspaceMembers.createdAt,
  name: users.name,
  email: users.email,
})
```

**After**:
```typescript
.select({
  id: workspaceMembers.id,
  userId: workspaceMembers.userId,
  role: workspaceMembers.role,
  status: workspaceMembers.status,
  adminEncryptedUserPrivateKey: workspaceMembers.adminEncryptedUserPrivateKey,
  createdAt: workspaceMembers.createdAt,
  name: users.name,
  email: users.email,
  publicKey: users.publicKey,
})
```

### 3. Add `publicKey` to `listMembers` service mapping

**File**: `packages/backend/src/services/members/listMembers/index.ts`

Add `publicKey: row.publicKey` to the map callback (line 17-25):

**Before**:
```typescript
return rows.map((row) => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  email: row.email,
  role: row.role as WorkspaceRole,
  status: (row.status ?? "active") as WorkspaceMemberStatus,
  adminEncryptedUserPrivateKey: row.adminEncryptedUserPrivateKey,
  createdAt: row.createdAt.toISOString(),
}));
```

**After**:
```typescript
return rows.map((row) => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  email: row.email,
  publicKey: row.publicKey,
  role: row.role as WorkspaceRole,
  status: (row.status ?? "active") as WorkspaceMemberStatus,
  adminEncryptedUserPrivateKey: row.adminEncryptedUserPrivateKey,
  createdAt: row.createdAt.toISOString(),
}));
```

### 4. Add shared types for new endpoints

**File**: `packages/shared/src/index.ts`

Add after `IDeleteFolderAclResponse` (around line 386):

```typescript
export interface IFolderMemberItem {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface IListFolderMembersResponse {
  members: IFolderMemberItem[];
}

export interface IBulkCreateFolderAclRequest {
  acls: ICreateFolderAclRequest[];
}

export interface IBulkCreateFolderAclResponse {
  acls: FolderAcl[];
}
```

### 5. Add `findAllByFolderId` to folderAcls repository

**File**: `packages/backend/src/repositories/folderAcls/index.ts`

Add a new function after `findByFolderIdAndUserId` (after line 30). This joins `folderAcls` with `users` to return member info. Copy the join pattern from `workspaceMembers/index.ts:findAllByWorkspaceId`.

```typescript
export const findAllByFolderId = async (
  db: Database,
  folderId: string,
) => {
  return db
    .select({
      userId: folderAcls.userId,
      encryptedFolderKey: folderAcls.encryptedFolderKey,
      createdAt: folderAcls.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(folderAcls)
    .innerJoin(users, eq(folderAcls.userId, users.id))
    .where(eq(folderAcls.folderId, folderId));
};
```

Add `users` to the import from schema: `import { folderAcls, folders, users } from "../../db/schema.js";`

### 6. Add `bulkCreate` to folderAcls repository

**File**: `packages/backend/src/repositories/folderAcls/index.ts`

Add a new function after `findAllByFolderId`:

```typescript
export const bulkCreate = async (
  db: Database,
  data: (typeof folderAcls.$inferInsert)[],
) => {
  const result = await db.insert(folderAcls).values(data).returning();
  return result;
};
```

### 7. Create `listFolderMembers` service

**File**: `packages/backend/src/services/folders/listFolderMembers/index.ts` (new file)

Copy the pattern from `deleteFolderAcl/index.ts` for access verification:

```typescript
import type { IListFolderMembersResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";

export const listFolderMembers = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
): Promise<IListFolderMembersResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await folderAclsRepo.findAllByFolderId(db, folderId);

  return {
    members: rows.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt.toISOString(),
    })),
  };
};
```

### 8. Create `bulkCreateFolderAcl` service

**File**: `packages/backend/src/services/folders/bulkCreateFolderAcl/index.ts` (new file)

Copy the access-check pattern from `createFolderAcl/index.ts`. Add duplicate filtering:

```typescript
import type {
  IBulkCreateFolderAclRequest,
  IBulkCreateFolderAclResponse,
} from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as folderAclsRepo from "../../../repositories/folderAcls";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const bulkCreateFolderAcl = async (
  db: Database,
  requestingUserId: string,
  folderId: string,
  data: IBulkCreateFolderAclRequest,
): Promise<IBulkCreateFolderAclResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, requestingUserId);

  if (!folder) {
    throw new HttpError(403, "Access denied");
  }

  const existing = await folderAclsRepo.findAllByFolderId(db, folderId);
  const existingUserIds = new Set(existing.map((e) => e.userId));

  const newAcls = data.acls.filter((acl) => !existingUserIds.has(acl.userId));

  if (newAcls.length === 0) {
    return { acls: [] };
  }

  const rows = await folderAclsRepo.bulkCreate(
    db,
    newAcls.map((acl) => ({
      folderId,
      userId: acl.userId,
      encryptedFolderKey: acl.encryptedFolderKey,
    })),
  );

  return { acls: rows.map(mapTimestamps) };
};
```

### 9. Export new services from barrel

**File**: `packages/backend/src/services/folders/index.ts`

**Before**:
```typescript
export { createFolderAcl } from "./createFolderAcl";
export { deleteFolderAcl } from "./deleteFolderAcl";
```

**After**:
```typescript
export { createFolderAcl } from "./createFolderAcl";
export { bulkCreateFolderAcl } from "./bulkCreateFolderAcl";
export { deleteFolderAcl } from "./deleteFolderAcl";
export { listFolderMembers } from "./listFolderMembers";
```

### 10. Create `listFolderMembersRoute`

**File**: `packages/backend/src/routes/folders/listFolderMembers/index.ts` (new file)

Copy the pattern from `deleteFolderAcl/index.ts` (GET instead of DELETE):

```typescript
import type { FastifyInstance } from "fastify";
import type { IListFolderMembersResponse } from "@tayemno/shared";
import { listFolderMembers } from "../../../services/folders";

export const listFolderMembersRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { folderId: string };
  }>("/:folderId/members", async (request, reply): Promise<IListFolderMembersResponse> => {
    try {
      return await listFolderMembers(
        app.db,
        request.user.sub,
        request.params.folderId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

### 11. Create `bulkCreateFolderAclRoute`

**File**: `packages/backend/src/routes/folders/bulkCreateFolderAcl/index.ts` (new file)

Copy the pattern from `createFolderAcl/index.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import type {
  IBulkCreateFolderAclRequest,
  IBulkCreateFolderAclResponse,
} from "@tayemno/shared";
import { bulkCreateFolderAcl } from "../../../services/folders";

export const bulkCreateFolderAclRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { folderId: string };
    Body: IBulkCreateFolderAclRequest;
  }>("/:folderId/acl/bulk", async (request, reply): Promise<IBulkCreateFolderAclResponse> => {
    try {
      return await bulkCreateFolderAcl(
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

### 12. Register new routes

**File**: `packages/backend/src/routes/folders/index.ts`

Add imports and registrations:

**Before**:
```typescript
import { createFolderAclRoute } from "./createFolderAcl";
import { deleteFolderAclRoute } from "./deleteFolderAcl";
```

**After**:
```typescript
import { createFolderAclRoute } from "./createFolderAcl";
import { bulkCreateFolderAclRoute } from "./bulkCreateFolderAcl";
import { deleteFolderAclRoute } from "./deleteFolderAcl";
import { listFolderMembersRoute } from "./listFolderMembers";
```

And inside `foldersRoutes`, add after `deleteFolderAclRoute`:

```typescript
await app.register(listFolderMembersRoute);
await app.register(bulkCreateFolderAclRoute);
```
