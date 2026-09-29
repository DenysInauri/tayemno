# Folder Size Display

Adds a `GET /workspaces/:workspaceId/folders/:folderId/size` endpoint that computes the total original and encrypted size of all vaults recursively nested under a folder. The frontend fetches this per folder row independently, so the folder list loads instantly and sizes appear asynchronously.

## Decisions

1. **Compute on-demand (not stored):** Folder sizes are calculated via recursive CTE on each request. No stored/materialized sizes on the folder row. Avoids race conditions with concurrent writes. — Approved.
2. **Individual endpoints:** One `GET .../folders/:folderId/size` per folder (not a batch endpoint). React Query caches each independently. — Approved.
3. **Folder type unchanged:** No size fields added to the `Folder` interface. A new `IGetFolderSizeResponse` type is used instead. — Approved.
4. **No caching beyond React Query:** The query recomputes on every uncached GET. React Query's default stale/cache behavior handles client-side caching. — Approved.

## Verified Findings

- Folder routes are registered with prefix `/workspaces/:workspaceId/folders` at `packages/backend/src/index.ts:61`. New route at `/:folderId/size` becomes `/workspaces/:workspaceId/folders/:folderId/size`.
- Existing `getFolderRoute` at `packages/backend/src/routes/folders/getFolder/index.ts:5-22` demonstrates the param extraction pattern: `Params: { workspaceId: string; folderId: string }`.
- `getFolder` service at `packages/backend/src/services/folders/getFolder/index.ts:7-36` demonstrates the access control pattern: verify workspace membership, then fetch folder by ID and userId.
- Folders repository at `packages/backend/src/repositories/folders/index.ts:5-25` already uses recursive CTEs for `findAncestors`. The same pattern applies for descendant aggregation.
- Vaults DB columns: `size_bytes` (SQL) / `sizeBytes` (Drizzle) and `encrypted_size_bytes` / `encryptedSizeBytes` — both `bigint` at `packages/backend/src/db/schema.ts:173-174`.
- Folder services barrel export at `packages/backend/src/services/folders/index.ts` exports `createFolder`, `getFolder`, `getFolders`.
- Folder routes index at `packages/backend/src/routes/folders/index.ts` registers `createFolderRoute`, `getFolderRoute`, `getFoldersRoute`.
- `QueryKeyEnum` at `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` has `FOLDER`, `FOLDERS`, `VAULTS`, `IS_EMAIL_FREE`.
- `useGetFolder` at `packages/frontend/src/api/hooks/useGetFolder/index.ts` demonstrates the hook pattern: `useApiGet` with `[QueryKeyEnum.FOLDER, folderId]` key and `enabled: !!workspace && !!folderId`.
- `FoldersList` at `packages/frontend/src/components/files/FoldersList/index.tsx:11-29` maps over folders and renders `FileListItem` directly. To call a hook per folder, a wrapper component is needed.
- `FileListItem` at `packages/frontend/src/components/files/FileListItem/index.tsx:34,39` guards size display with `!isFolder` — this guard must be removed (or changed) to show folder sizes.

## Behavioral Changes

- Each folder row in the file list now shows its total size (original and encrypted) aggregated across all descendant vaults.
- Sizes appear asynchronously after the folder list renders — no blocking.
- Empty folders show no size (0 vaults → no size text).
- Navigating back to a previously viewed folder shows cached sizes instantly (React Query cache).

## Phase Table

| # | Name | Plan | Depends on |
|---|------|------|------------|
| 1 | Folder size endpoint + UI | [phase-1-folder-size-endpoint/plan.md](phase-1-folder-size-endpoint/plan.md) | — |

## Out of Scope

- Stored/materialized folder sizes in the folders table.
- Batch endpoint for multiple folder sizes.
- Root-level aggregate (total workspace size).
- Storage quota enforcement.
- Loading skeletons or spinners for pending size requests.
