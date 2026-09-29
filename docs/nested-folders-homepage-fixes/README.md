# Nested Folders + HomePage Fixes

Fix three bugs on `HomePage` and add `parentFolderId` to the folder model so folders can be nested. The `parentFolderId` column is purely structural (UI tree hierarchy) — each folder keeps its own independent symmetric key encrypted per-user via `folder_members`. Access to a parent folder does NOT grant access to child folders; each folder requires an explicit `folder_members` row.

## Decisions

1. **Folder key encryption for subfolders — independent keys, no chain.** Each subfolder gets its own symmetric key encrypted directly with admin public key (master copy in `folders.encrypted_symmetric_key`) and user public key (per-user copy in `folder_members.encrypted_symmetric_key`). The `parentFolderId` is purely for UI hierarchy, not key derivation. This ensures a user with access to `groupA` can decrypt it directly without the parent key, and cannot decrypt sibling `groupB`. Approved.

2. **Breadcrumb folder name — pass via React Router `location.state`.** When navigating into a folder from `FoldersList`, pass `folderName` and `folderEncryptedKey` in route state. Zero extra API calls. Falls back to folderId on direct URL navigation (refresh/bookmark). A dedicated `GET /folders/:id` endpoint can be added later if refresh support matters. Approved.

3. **Upload key access — pass `folderEncryptedKey` through props.** The encrypted key travels from `location.state` through `HomePage` → `AddNewEntity` → `UploadFileModal` → `useUploadVault.upload()`. This removes `useUploadVault`'s dependency on `useGetFolders`. Approved.

4. **`onDelete: "cascade"` for `parentFolderId`.** Deleting a parent folder cascade-deletes child folders. Approved.

## Verified Findings

### Bug 1 — Breadcrumb shows "..."

- `packages/frontend/src/pages/HomePage/index.tsx:42` — hardcoded `<Text size="sm">...</Text>` instead of folder name.
- `useGetFolders` (`packages/frontend/src/api/hooks/useGetFolders/index.ts:9`) returns a `dataMap` (foldersById) but `HomePage` never uses it.

### Bug 2 — Root folders visible inside a folder

- `HomePage:26` calls `useGetFolders()` with no args — returns ALL folders the user has membership in.
- Backend repo `findByWorkspaceIdAndUserId` (`packages/backend/src/repositories/folders/index.ts:13-41`) has no `parentFolderId` filter.

### Bug 3 — Can't upload vault to root

- `AddNewEntity` (`packages/frontend/src/components/files/AddNewEntity/index.tsx:58-74`) shows "Create Folder" only when `!folderId`, "Upload File" only when `folderId` is set.
- `useGetVaults` (`packages/frontend/src/api/hooks/useGetVaults/index.ts:11`) has `enabled: !!folderId`.
- `useUploadVault` (`packages/frontend/src/api/hooks/useUploadVault/index.ts:18`) requires `folderId: string` (non-null).
- Backend `getVaults` service (`packages/backend/src/services/vaults/getVaults/index.ts:7-31`) requires `folderId: string`.
- Backend vaults repo (`packages/backend/src/repositories/vaults/index.ts:13-24`) only has `findByFolderId`.
- `IGetVaultsRequest` (`packages/shared/src/index.ts:283-285`) — `folderId` is required.

### Schema gap — no parentFolderId

- `folders` table (`packages/backend/src/db/schema.ts:120-136`) has no `parentFolderId` column.
- `Folder` shared type (`packages/shared/src/index.ts:75-82`) has no `parentFolderId`.

### Encryption — existing model (unchanged)

- `folders.encrypted_symmetric_key` — admin master copy, encrypted with workspace admin public key (sealed box). See `encryption-key-hierarchy.md:67`.
- `folder_members.encrypted_symmetric_key` — per-user copy, encrypted with user public key (sealed box). See `encryption-key-hierarchy.md:68`.
- Vault in folder: vault key encrypted with folder symmetric key (XChaCha20-Poly1305 + nonce). See `encryption-key-hierarchy.md:69`.
- Standalone vault (no folder): vault key encrypted with member workspace public key (sealed box, nonce null). See `encryption-key-hierarchy.md:70`.
- `presignVault` service (`packages/backend/src/services/vaults/presignVault/index.ts:17-37`) already handles both folder and root paths.
- `createVault` service (`packages/backend/src/services/vaults/createVault/index.ts:20-40`) already handles both paths.
- `IPresignVaultRequest.folderId` and `ICreateVaultRequest.folderId` are already `?: string | null` (`packages/shared/src/index.ts:256,268`).

### Consumers (call site counts)

- `useGetFolders`: `HomePage` (line 26), `useUploadVault` (line 13) — 2 call sites.
- `useGetVaults`: `HomePage` (line 27) — 1 call site.
- `useUploadVault`: `UploadFileModal` (line 26) — 1 call site.
- `usePostCreateFolder`: `AddNewEntity` (line 21) — 1 call site.

### Route structure

- Folders: `GET /workspaces/:workspaceId/folders` — prefix registered at `packages/backend/src/index.ts:61`.
- Vaults: `GET /vaults?folderId=<id>` — prefix `/vaults` at `packages/backend/src/index.ts:62`.

### Query invalidation

- `usePostCreateFolder` invalidates `[QueryKeyEnum.FOLDERS]` — prefix match hits all folder queries. (`packages/frontend/src/api/hooks/usePostCreateFolder/index.ts:16`).
- `usePostCreateVault` invalidates `[QueryKeyEnum.VAULTS]` — prefix match hits all vault queries. (`packages/frontend/src/api/hooks/usePostCreateVault/index.ts:14`).

## Behavioral Changes

- Folders table gains a nullable `parent_folder_id` column (self-referencing FK with cascade delete).
- `GET /workspaces/:workspaceId/folders` accepts optional `?parentFolderId=<uuid>` query param. Without it: returns root folders (parent IS NULL). With it: returns children of that folder.
- `GET /vaults` accepts optional `?workspaceId=<uuid>` alongside optional `?folderId=<uuid>`. When `folderId` is present: folder-scoped query (existing behavior). When only `workspaceId`: root-level vaults (folderId IS NULL).
- `POST /workspaces/:workspaceId/folders` accepts optional `parentFolderId` in request body. When present, validates parent folder membership before creating.
- HomePage shows only child folders of the current context (root or parent folder), not all folders.
- Breadcrumb shows actual folder name (from route state) instead of "...".
- "Create Folder" and "Upload File" menu items both appear regardless of folder context.
- Root-level file upload encrypts vault key with member workspace public key (sealed box).
- Folder-level file upload encrypts vault key with folder symmetric key (unchanged).

## Phases

| # | Name | Plan | Depends on |
|---|------|------|------------|
| 1 | [Backend: schema + nested folders + root vaults](phase-1-backend-schema/plan.md) | Add `parentFolderId` column, filter folders by parent, root-level vault query, update shared types | — |
| 2 | [Frontend: hooks + components fixes](phase-2-frontend-fixes/plan.md) | Update `useGetFolders`, `useGetVaults`, `useUploadVault`, `HomePage`, `AddNewEntity`, `UploadFileModal`, `FoldersList` | Phase 1 |

## Out of Scope

- Full breadcrumb trail (Root > GrandParent > Parent > Current) — needs ancestor chain endpoint
- Direct URL refresh resolving folder name (needs `GET /folders/:id` endpoint)
- Admin UI for managing folder membership / sharing
- Moving folders or vaults between folders
- Folder rename
- Recursive folder deletion UI (backend cascade handles it silently)
- Changes to `encryption-key-hierarchy.md` (already documents standalone vaults correctly)
- Nested folder key derivation chains (explicitly rejected — keys stay independent)
