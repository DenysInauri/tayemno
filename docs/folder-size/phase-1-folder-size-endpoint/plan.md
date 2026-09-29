# Phase 1 — Folder Size Endpoint + UI

**Size/shape:** 3 new backend files (route, service, repository function), 2 new frontend files (hook, wrapper component), edits to 5 existing files. Single phase.

**Why this approach is sufficient — don't add anything beyond this:** One endpoint per folder, one recursive CTE per request. No materialized views, no stored sizes, no batch endpoints, no loading indicators. React Query handles caching. Don't add error states, retry UI, or skeleton loaders for the size cells — an empty cell while loading is fine.

---

## Step 1 — Add recursive CTE query to folders repository

**Edit** `packages/backend/src/repositories/folders/index.ts`

Add a new exported function `findDescendantSizes` at the end of the file. This function uses a recursive CTE to traverse all descendant folders from a given folder, then sums the `size_bytes` and `encrypted_size_bytes` of all vaults in those folders.

```ts
export const findDescendantSizes = async (
  db: Database,
  folderId: string,
) => {
  const rows = await db.execute(sql`
    WITH RECURSIVE descendant_folders AS (
      SELECT id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN descendant_folders df ON f.parent_folder_id = df.id
    )
    SELECT
      COALESCE(SUM(v.size_bytes), 0)::bigint AS "sizeBytes",
      COALESCE(SUM(v.encrypted_size_bytes), 0)::bigint AS "encryptedSizeBytes"
    FROM vaults v
    WHERE v.folder_id IN (SELECT id FROM descendant_folders)
  `);
  return rows[0] as unknown as { sizeBytes: number; encryptedSizeBytes: number };
};
```

**Notes:**
- The CTE starts with the folder itself and walks down through `parent_folder_id`.
- Sums all vault sizes across all descendant folders.
- `COALESCE(..., 0)` returns 0 for empty folders.
- Cast to `bigint` to match the column types.
- Requires adding `sql` to the existing imports from `drizzle-orm` (verify it's already imported — it is, on line 1).

---

## Step 2 — Create getFolderSize service

**Create** `packages/backend/src/services/folders/getFolderSize/index.ts`

Pattern to imitate: `packages/backend/src/services/folders/getFolder/index.ts` — same access control pattern.

```ts
import type { Database } from "../../../db";
import type { IGetFolderSizeResponse } from "@tayemno/shared";
import { findDescendantSizes } from "../../../repositories/folders";
import * as folderMembersRepo from "../../../repositories/folderMembers";
import { HttpError } from "../../../utils/httpError";

export const getFolderSize = async (
  db: Database,
  userId: string,
  folderId: string,
): Promise<IGetFolderSizeResponse> => {
  const membership = await folderMembersRepo.findByFolderIdAndUserId(
    db,
    folderId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const sizes = await findDescendantSizes(db, folderId);

  return {
    sizeBytes: Number(sizes.sizeBytes),
    encryptedSizeBytes: Number(sizes.encryptedSizeBytes),
  };
};
```

**Notes:**
- Access control checks `folderMembers` (user must be a member of the folder).
- `Number()` wraps the result in case PostgreSQL returns bigint as string.
- No workspace membership check needed — folder membership implies workspace access.

---

## Step 3 — Create getFolderSize route

**Create** `packages/backend/src/routes/folders/getFolderSize/index.ts`

Pattern to imitate: `packages/backend/src/routes/folders/getFolder/index.ts`.

```ts
import type { FastifyInstance } from "fastify";
import type { IGetFolderSizeResponse } from "@tayemno/shared";
import { getFolderSize } from "../../../services/folders";

export const getFolderSizeRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string; folderId: string };
  }>("/:folderId/size", async (request, reply): Promise<IGetFolderSizeResponse> => {
    try {
      return await getFolderSize(
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

**Notes:**
- Route path is `/:folderId/size`. Full URL: `/workspaces/:workspaceId/folders/:folderId/size`.
- `workspaceId` is not passed to the service (folder membership is sufficient).

---

## Step 4 — Register route and export service

**Edit** `packages/backend/src/routes/folders/index.ts`

Add import and registration:

**Before:**
```ts
import { createFolderRoute } from "./createFolder";
import { getFolderRoute } from "./getFolder";
import { getFoldersRoute } from "./getFolders";

export const foldersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(createFolderRoute);
  await app.register(getFolderRoute);
  await app.register(getFoldersRoute);
};
```

**After:**
```ts
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
```

**Edit** `packages/backend/src/services/folders/index.ts`

**Before:**
```ts
export { createFolder } from "./createFolder";
export { getFolder } from "./getFolder";
export { getFolders } from "./getFolders";
```

**After:**
```ts
export { createFolder } from "./createFolder";
export { getFolder } from "./getFolder";
export { getFolderSize } from "./getFolderSize";
export { getFolders } from "./getFolders";
```

---

## Step 5 — Add shared type

**Edit** `packages/shared/src/index.ts`

Add after `IGetFolderResponse` (around line 294):

```ts
export interface IGetFolderSizeResponse {
  sizeBytes: number;
  encryptedSizeBytes: number;
}
```

---

## Step 6 — Add QueryKeyEnum entry

**Edit** `packages/frontend/src/enums/api/QueryKeyEnum/index.ts`

**Before:**
```ts
export enum QueryKeyEnum {
  IS_EMAIL_FREE = "isEmailFree",
  FOLDER = "folder",
  FOLDERS = "folders",
  VAULTS = "vaults",
}
```

**After:**
```ts
export enum QueryKeyEnum {
  IS_EMAIL_FREE = "isEmailFree",
  FOLDER = "folder",
  FOLDER_SIZE = "folderSize",
  FOLDERS = "folders",
  VAULTS = "vaults",
}
```

---

## Step 7 — Create useGetFolderSize hook

**Create** `packages/frontend/src/api/hooks/useGetFolderSize/index.ts`

Pattern to imitate: `packages/frontend/src/api/hooks/useGetFolder/index.ts`.

```ts
import type { IGetFolderSizeResponse } from "@tayemno/shared";

import { useApiGet } from "../useApiGet";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { useAuth } from "../../../contexts/AuthContext";

export const useGetFolderSize = (folderId: string) => {
  const { workspace } = useAuth();

  return useApiGet<IGetFolderSizeResponse>(
    [QueryKeyEnum.FOLDER_SIZE, folderId],
    `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders/${folderId}/size`,
    { enabled: !!workspace },
  );
};
```

**Notes:**
- `folderId` is always a string (never null) since this is only called for existing folders.
- Returns the full query object. Consumers access `data?.sizeBytes` and `data?.encryptedSizeBytes`.

---

## Step 8 — Create FolderListItem wrapper component

**Create** `packages/frontend/src/components/files/FolderListItem/index.tsx`

This wrapper exists solely to call the `useGetFolderSize` hook per folder (hooks can't be called in a map callback).

```tsx
import { useNavigate } from "react-router-dom";
import type { Folder } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { useGetFolderSize } from "../../../api/hooks/useGetFolderSize";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

interface IProps {
  folder: Folder;
}

export const FolderListItem = ({ folder }: IProps) => {
  const navigate = useNavigate();
  const { data } = useGetFolderSize(folder.id);

  return (
    <FileListItem
      name={folder.name}
      isFolder
      sizeBytes={data?.sizeBytes}
      encryptedSizeBytes={data?.encryptedSizeBytes}
      updatedAt={folder.updatedAt}
      onClick={() =>
        navigate(RouteEnum.FOLDER.replace(":folderId", folder.id))
      }
    />
  );
};
```

---

## Step 9 — Update FoldersList to use FolderListItem

**Edit** `packages/frontend/src/components/files/FoldersList/index.tsx`

**Before:**
```tsx
import { useNavigate } from "react-router-dom";
import type { Folder } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

interface IProps {
  folders: Folder[];
}

export const FoldersList = ({ folders }: IProps) => {
  const navigate = useNavigate();

  return (
    <>
      {folders.map((folder) => (
        <FileListItem
          key={folder.id}
          name={folder.name}
          isFolder
          updatedAt={folder.updatedAt}
          onClick={() =>
            navigate(RouteEnum.FOLDER.replace(":folderId", folder.id))
          }
        />
      ))}
    </>
  );
};
```

**After:**
```tsx
import type { Folder } from "@tayemno/shared";

import { FolderListItem } from "../FolderListItem";

interface IProps {
  folders: Folder[];
}

export const FoldersList = ({ folders }: IProps) => (
  <>
    {folders.map((folder) => (
      <FolderListItem key={folder.id} folder={folder} />
    ))}
  </>
);
```

**Notes:**
- `useNavigate` removed — it moved into `FolderListItem`.
- `RouteEnum` import removed — no longer used here.
- Component simplified to just a map.

---

## Step 10 — Update FileListItem to show sizes for folders

**Edit** `packages/frontend/src/components/files/FileListItem/index.tsx`

The size cell guards currently check `!isFolder`. Remove that guard so folders also display sizes.

**Before (line 34):**
```tsx
        {!isFolder && !!sizeBytes ? formatFileSize(sizeBytes) : ""}
```

**After:**
```tsx
        {!!sizeBytes ? formatFileSize(sizeBytes) : ""}
```

**Before (line 39):**
```tsx
        {!isFolder && !!encryptedSizeBytes ? formatFileSize(encryptedSizeBytes) : ""}
```

**After:**
```tsx
        {!!encryptedSizeBytes ? formatFileSize(encryptedSizeBytes) : ""}
```

This allows both folders and vaults to display sizes when the props are provided. Folders with no vaults (0 bytes) will show empty since `!!0` is `false`, which is the desired behavior.
