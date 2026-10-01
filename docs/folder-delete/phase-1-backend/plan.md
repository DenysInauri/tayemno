# Phase 1 — Backend: S3 Key Restructure + Delete Folder Endpoint

**Size/shape:** 5 files modified, 3 files created. Small-to-medium phase.

**Why this approach is sufficient:** The recursive CTE pattern already exists in `findDescendantSizes` — we reuse it to collect vault S3 keys. The `deleteVault` route+service is the direct sibling pattern for the new `deleteFolder` route+service. S3 key restructure is a one-line change in `presignVault`. No new abstractions, no new libraries, no new patterns needed.

---

## Steps

### Step 1 — Add `IDeleteFolderResponse` to shared types

**File:** `packages/shared/src/index.ts`

Add after the existing `IDeleteVaultResponse` (line ~323):

```ts
// BEFORE (existing, do not change):
export interface IDeleteVaultResponse {
  message: string;
}

// ADD after it:
export interface IDeleteFolderResponse {
  message: string;
}
```

### Step 2 — Restructure S3 key format in `presignVault`

**File:** `packages/backend/src/services/vaults/presignVault/index.ts`

Change line 39 from:

```ts
const s3Key = `vaults/${crypto.randomUUID()}/${data.fileName}`;
```

To:

```ts
const folderSegment = data.folderId ?? "root";
const s3Key = `${data.workspaceId}/${folderSegment}/${crypto.randomUUID()}/${data.fileName}`;
```

Nothing else in this file changes. `data.workspaceId` and `data.folderId` are already available (lines 15, 17).

### Step 3 — Add repository functions for folder deletion

**File:** `packages/backend/src/repositories/folders/index.ts`

Add two new exported functions at the end of the file.

#### 3a — `findDescendantVaultS3Keys`

Uses the same recursive CTE pattern as the existing `findDescendantSizes` (lines 58-76) but selects vault `s3_key` values instead of sizes:

```ts
export const findDescendantVaultS3Keys = async (
  db: Database,
  folderId: string,
): Promise<string[]> => {
  const rows = await db.execute(sql`
    WITH RECURSIVE descendant_folders AS (
      SELECT id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN descendant_folders df ON f.parent_folder_id = df.id
    )
    SELECT v.s3_key AS "s3Key"
    FROM vaults v
    WHERE v.folder_id IN (SELECT id FROM descendant_folders)
  `);
  return (rows as unknown as { s3Key: string }[]).map((r) => r.s3Key);
};
```

#### 3b — `findDescendantIds`

Returns all descendant folder IDs (including the folder itself) for deletion:

```ts
export const findDescendantIds = async (
  db: Database,
  folderId: string,
): Promise<string[]> => {
  const rows = await db.execute(sql`
    WITH RECURSIVE descendant_folders AS (
      SELECT id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN descendant_folders df ON f.parent_folder_id = df.id
    )
    SELECT id FROM descendant_folders
  `);
  return (rows as unknown as { id: string }[]).map((r) => r.id);
};
```

#### 3c — `deleteByIds`

Deletes folders by a list of IDs. Vaults and folder_members cascade-delete via FK constraints:

```ts
export const deleteByIds = async (
  db: Database,
  ids: string[],
) => {
  await db.delete(folders).where(inArray(folders.id, ids));
};
```

Add `inArray` to the import from `drizzle-orm` at line 1:

```ts
// BEFORE:
import { eq, and, asc, sql, isNull } from "drizzle-orm";

// AFTER:
import { eq, and, asc, sql, isNull, inArray } from "drizzle-orm";
```

### Step 4 — Create `deleteFolder` service

**New file:** `packages/backend/src/services/folders/deleteFolder/index.ts`

Follow the same structure as `services/vaults/deleteVault/index.ts`. The service:

1. Looks up the folder (via `findByIdAndUserId` from the folders repo — ensures the user is a member)
2. Throws 404 if not found
3. Collects all descendant vault S3 keys
4. Deletes S3 objects in batches (AWS `DeleteObjects` accepts max 1000 keys per call)
5. Collects all descendant folder IDs
6. Deletes all folders by IDs (cascades handle vaults + folder_members in DB)
7. Returns `{ message: "Folder deleted" }`

```ts
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import type { IDeleteFolderResponse } from "@tayemno/shared";
import type { Database } from "../../../db";
import type { S3 } from "../../../utils/s3";
import * as foldersRepo from "../../../repositories/folders";
import { HttpError } from "../../../utils/httpError";

export const deleteFolder = async (
  s3: S3,
  bucket: string,
  db: Database,
  userId: string,
  folderId: string,
): Promise<IDeleteFolderResponse> => {
  const folder = await foldersRepo.findByIdAndUserId(db, folderId, userId);

  if (!folder) {
    throw new HttpError(404, "Folder not found");
  }

  const s3Keys = await foldersRepo.findDescendantVaultS3Keys(db, folderId);

  const BATCH_SIZE = 1000;
  for (let i = 0; i < s3Keys.length; i += BATCH_SIZE) {
    const batch = s3Keys.slice(i, i + BATCH_SIZE);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
        },
      }),
    );
  }

  const descendantIds = await foldersRepo.findDescendantIds(db, folderId);
  await foldersRepo.deleteByIds(db, descendantIds);

  return { message: "Folder deleted" };
};
```

### Step 5 — Export `deleteFolder` from the services barrel

**File:** `packages/backend/src/services/folders/index.ts`

Add one line:

```ts
// BEFORE:
export { createFolder } from "./createFolder";
export { getFolder } from "./getFolder";
export { getFolderSize } from "./getFolderSize";
export { getFolders } from "./getFolders";

// AFTER:
export { createFolder } from "./createFolder";
export { deleteFolder } from "./deleteFolder";
export { getFolder } from "./getFolder";
export { getFolderSize } from "./getFolderSize";
export { getFolders } from "./getFolders";
```

### Step 6 — Create `deleteFolder` route

**New file:** `packages/backend/src/routes/folders/deleteFolder/index.ts`

Follow the same structure as `routes/vaults/deleteVault/index.ts`:

```ts
import type { FastifyInstance } from "fastify";
import type { IDeleteFolderResponse } from "@tayemno/shared";
import { deleteFolder } from "../../../services/folders";

export const deleteFolderRoute = async (app: FastifyInstance) => {
  app.delete<{
    Params: { workspaceId: string; folderId: string };
  }>("/:folderId", async (request, reply): Promise<IDeleteFolderResponse> => {
    try {
      return await deleteFolder(
        app.s3,
        app.config.S3_BUCKET,
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

Note: `workspaceId` is available in params from the route prefix (`/workspaces/:workspaceId/folders`) but the service only needs `folderId` — membership is checked via `findByIdAndUserId` which joins `folder_members`.

### Step 7 — Register the route

**File:** `packages/backend/src/routes/folders/index.ts`

```ts
// BEFORE:
import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { createFolderRoute } from "./createFolder";
import { getFolderRoute } from "./getFolder";
import { getFolderSizeRoute } from "./getFolderSize";
import { getFoldersRoute } from "./getFolders";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(createFolderRoute);
  await app.register(getFolderRoute);
  await app.register(getFolderSizeRoute);
  await app.register(getFoldersRoute);
};

// AFTER:
import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { createFolderRoute } from "./createFolder";
import { deleteFolderRoute } from "./deleteFolder";
import { getFolderRoute } from "./getFolder";
import { getFolderSizeRoute } from "./getFolderSize";
import { getFoldersRoute } from "./getFolders";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(createFolderRoute);
  await app.register(deleteFolderRoute);
  await app.register(getFolderRoute);
  await app.register(getFolderSizeRoute);
  await app.register(getFoldersRoute);
};
```

### Step 8 — Verify CORS allows DELETE method

The vault delete feature already added DELETE to CORS (commit `7a040de`). Verify this by reading the CORS config in `packages/backend/src/index.ts`. If DELETE is already listed in the allowed methods, no change needed.

---

## Files Changed Summary

| Action | File |
|--------|------|
| Edit | `packages/shared/src/index.ts` — add `IDeleteFolderResponse` |
| Edit | `packages/backend/src/services/vaults/presignVault/index.ts` — S3 key format |
| Edit | `packages/backend/src/repositories/folders/index.ts` — add 3 functions + `inArray` import |
| Create | `packages/backend/src/services/folders/deleteFolder/index.ts` |
| Edit | `packages/backend/src/services/folders/index.ts` — add export |
| Create | `packages/backend/src/routes/folders/deleteFolder/index.ts` |
| Edit | `packages/backend/src/routes/folders/index.ts` — register route |
