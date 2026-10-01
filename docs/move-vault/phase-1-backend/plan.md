# Phase 1 — Backend: Folder Tree + Move Vault + S3 Key Simplification

**Size:** 3 new files (route + service + shared types), 5 edits to existing files. Small phase — don't add validation schemas, tests, or middleware beyond what's listed here.

## Why this approach is sufficient

The backend only stores the pre-encrypted vault key that the client sends. It does not perform any cryptography. The move endpoint is a simple PATCH that updates `folderId`, `encryptedSymmetricKey`, and `symmetricKeyNonce` after verifying access to both source and destination. The folder tree endpoint is a single recursive CTE query. No new middleware, no new auth patterns — follow the existing route/service/repository three-layer architecture exactly.

---

## Step 1 — Add shared types

**File:** `packages/shared/src/index.ts`

Add after `IDeleteFolderResponse` (line 327):

```typescript
export interface IMoveVaultRequest {
  targetFolderId: string | null;
  encryptedSymmetricKey: string;
  symmetricKeyNonce: string | null;
}

export interface IMoveVaultResponse {
  vault: Vault;
}

export interface IFolderTreeNode {
  id: string;
  name: string;
  children: IFolderTreeNode[];
}

export interface IGetFolderTreeResponse {
  folders: IFolderTreeNode[];
}
```

---

## Step 2 — Add `updateMove` to vaults repository

**File:** `packages/backend/src/repositories/vaults/index.ts`

Add after `deleteById` (line 54):

```typescript
export const updateMove = async (
  db: Database,
  vaultId: string,
  data: {
    folderId: string | null;
    encryptedSymmetricKey: string;
    symmetricKeyNonce: string | null;
  },
) => {
  const result = await db
    .update(vaults)
    .set({
      folderId: data.folderId,
      encryptedSymmetricKey: data.encryptedSymmetricKey,
      symmetricKeyNonce: data.symmetricKeyNonce,
    })
    .where(eq(vaults.id, vaultId))
    .returning();

  return result[0] ?? null;
};
```

Needs `update` imported from drizzle — check existing imports at line 1: `import { eq, and, asc, sql, isNull } from "drizzle-orm"`. The `update` is a method on `db`, not an import — no change needed to imports. But `set` method uses the column references already imported via `vaults` schema.

---

## Step 3 — Add `findAllByUserAsTree` to folders repository

**File:** `packages/backend/src/repositories/folders/index.ts`

Add after `deleteByIds` (line 152):

```typescript
export const findAllByUser = async (
  db: Database,
  workspaceId: string,
  userId: string,
) => {
  return db
    .select({
      id: folders.id,
      name: folders.name,
      parentFolderId: folders.parentFolderId,
    })
    .from(folderMembers)
    .innerJoin(folders, eq(folderMembers.folderId, folders.id))
    .where(
      and(
        eq(folders.workspaceId, workspaceId),
        eq(folderMembers.userId, userId),
      ),
    )
    .orderBy(
      asc(sql`regexp_replace(lower(${folders.name}), '\\d', '', 'g')`),
      asc(
        sql`COALESCE(NULLIF(regexp_replace(${folders.name}, '\\D', '', 'g'), ''), '0')::bigint`,
      ),
    );
};
```

This returns a flat list. The tree-building happens in the service layer (Step 4).

---

## Step 4 — Create `getFolderTree` service

**New file:** `packages/backend/src/services/folders/getFolderTree/index.ts`

Follow the sibling pattern from `getFolders/index.ts`. Copy its structure (imports, auth check, return type).

```typescript
import type { IFolderTreeNode, IGetFolderTreeResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as foldersRepo from "../../../repositories/folders";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const getFolderTree = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetFolderTreeResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const rows = await foldersRepo.findAllByUser(db, workspaceId, userId);

  const nodeMap = new Map<string, IFolderTreeNode>();
  for (const row of rows) {
    nodeMap.set(row.id, { id: row.id, name: row.name, children: [] });
  }

  const roots: IFolderTreeNode[] = [];
  for (const row of rows) {
    const node = nodeMap.get(row.id)!;
    if (row.parentFolderId && nodeMap.has(row.parentFolderId)) {
      nodeMap.get(row.parentFolderId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return { folders: roots };
};
```

---

## Step 5 — Create `getFolderTree` route

**New file:** `packages/backend/src/routes/folders/getFolderTree/index.ts`

Follow the sibling pattern from `getFolders/index.ts`.

```typescript
import type { FastifyInstance } from "fastify";
import type { IGetFolderTreeResponse } from "@tayemno/shared";
import { getFolderTree } from "../../../services/folders";

export const getFolderTreeRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string };
  }>("/tree", async (request, reply): Promise<IGetFolderTreeResponse> => {
    try {
      return await getFolderTree(
        app.db,
        request.user.sub,
        request.params.workspaceId,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

Note: This route is registered under the folders plugin which is already scoped to `/workspaces/:workspaceId/folders`. So the full path is `GET /workspaces/:workspaceId/folders/tree`.

---

## Step 6 — Register `getFolderTree` route

**File:** `packages/backend/src/routes/folders/index.ts`

Add import and registration:

Before (lines 4-6):
```typescript
import { getFolderRoute } from "./getFolder";
import { getFolderSizeRoute } from "./getFolderSize";
import { getFoldersRoute } from "./getFolders";
```

After:
```typescript
import { getFolderRoute } from "./getFolder";
import { getFolderSizeRoute } from "./getFolderSize";
import { getFoldersRoute } from "./getFolders";
import { getFolderTreeRoute } from "./getFolderTree";
```

Before (lines 14-16):
```typescript
  await app.register(getFolderSizeRoute);
  await app.register(getFoldersRoute);
};
```

After:
```typescript
  await app.register(getFolderSizeRoute);
  await app.register(getFoldersRoute);
  await app.register(getFolderTreeRoute);
};
```

---

## Step 7 — Export `getFolderTree` from services barrel

**File:** `packages/backend/src/services/folders/index.ts`

Add line:
```typescript
export { getFolderTree } from "./getFolderTree";
```

---

## Step 8 — Create `moveVault` service

**New file:** `packages/backend/src/services/vaults/moveVault/index.ts`

Follow the sibling pattern from `deleteVault/index.ts` (same auth-check structure).

```typescript
import type {
  IMoveVaultRequest,
  IMoveVaultResponse,
  Vault,
} from "@tayemno/shared";
import type { Database } from "../../../db";
import * as vaultsRepo from "../../../repositories/vaults";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import { HttpError } from "../../../utils/httpError";

const mapVault = (row: { createdAt: Date; updatedAt: Date }): Vault =>
  ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }) as Vault;

export const moveVault = async (
  db: Database,
  userId: string,
  vaultId: string,
  data: IMoveVaultRequest,
): Promise<IMoveVaultResponse> => {
  const vault = await vaultsRepo.findById(db, vaultId);

  if (!vault) {
    throw new HttpError(404, "Vault not found");
  }

  // Verify access to source
  if (vault.folderId) {
    const membership = await folderMembersRepo.findByFolderIdAndUserId(
      db,
      vault.folderId,
      userId,
    );
    if (!membership) throw new HttpError(403, "Access denied");
  } else {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      vault.workspaceId,
      userId,
    );
    if (!membership) throw new HttpError(403, "Access denied");
  }

  // Verify access to destination
  if (data.targetFolderId) {
    const membership = await folderMembersRepo.findByFolderIdAndUserId(
      db,
      data.targetFolderId,
      userId,
    );
    if (!membership) throw new HttpError(403, "Access denied to target folder");
  } else {
    const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
      db,
      vault.workspaceId,
      userId,
    );
    if (!membership) throw new HttpError(403, "Access denied");
  }

  // Prevent no-op move
  if (vault.folderId === data.targetFolderId) {
    throw new HttpError(400, "Vault is already in this folder");
  }

  const updated = await vaultsRepo.updateMove(db, vaultId, {
    folderId: data.targetFolderId,
    encryptedSymmetricKey: data.encryptedSymmetricKey,
    symmetricKeyNonce: data.symmetricKeyNonce,
  });

  if (!updated) {
    throw new HttpError(500, "Failed to move vault");
  }

  return { vault: mapVault(updated) };
};
```

---

## Step 9 — Create `moveVault` route

**New file:** `packages/backend/src/routes/vaults/moveVault/index.ts`

Follow the sibling pattern from `deleteVault/index.ts`.

```typescript
import type { FastifyInstance } from "fastify";
import type { IMoveVaultRequest, IMoveVaultResponse } from "@tayemno/shared";
import { moveVault } from "../../../services/vaults";

export const moveVaultRoute = async (app: FastifyInstance) => {
  app.patch<{
    Params: { vaultId: string };
    Body: IMoveVaultRequest;
  }>("/:vaultId/move", async (request, reply): Promise<IMoveVaultResponse> => {
    try {
      return await moveVault(
        app.db,
        request.user.sub,
        request.params.vaultId,
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

---

## Step 10 — Register `moveVault` route

**File:** `packages/backend/src/routes/vaults/index.ts`

Before (lines 5-6):
```typescript
  await app.register(presignVaultRoute);
  await app.register(createVaultRoute);
```

Add import at top:
```typescript
import { moveVaultRoute } from "./moveVault";
```

Add registration (after `deleteVaultRoute`):
```typescript
  await app.register(moveVaultRoute);
```

---

## Step 11 — Export `moveVault` from services barrel

**File:** `packages/backend/src/services/vaults/index.ts`

Add line:
```typescript
export { moveVault } from "./moveVault";
```

---

## Step 12 — Simplify S3 key format in presignVault

**File:** `packages/backend/src/services/vaults/presignVault/index.ts`

Before (lines 39-40):
```typescript
  const folderSegment = data.folderId ?? "root";
  const s3Key = `${data.workspaceId}/${folderSegment}/${crypto.randomUUID()}/${data.fileName}`;
```

After:
```typescript
  const s3Key = `${data.workspaceId}/${crypto.randomUUID()}/${data.fileName}`;
```

Delete the `folderSegment` variable entirely.
