# Delete Folder Feature

Add the ability to delete folders, including all nested subfolders, contained vaults (both DB records and S3 objects), and folder member records. As part of this work, restructure S3 keys from a flat layout to a hierarchical `{workspaceId}/{folderId|root}/{vaultId}/{fileName}` layout so that future prefix-based operations are possible.

## Decisions

1. **S3 key format for root-level vaults:** Use `{workspaceId}/root/{vaultId}/{fileName}` — the literal `root` segment keeps path depth consistent and avoids ambiguity between a vault ID and a folder ID. **Approved.**
2. **S3 cleanup strategy for folder delete:** Query DB for all vault `s3Key` values in the folder's descendant tree (single recursive CTE), then batch-delete from S3 via `DeleteObjects`, then delete the folder row from DB (FK cascades handle vault rows, folder_member rows). **Approved.**
3. **No data migration needed:** There is no production data, so existing S3 objects and DB records can be discarded. The S3 key format change is applied only to the presign path. **Approved.**

## Verified Findings

These are the facts the plan relies on. An executing session should re-verify each one before acting on it.

| # | Fact | Location | Why it matters |
|---|------|----------|----------------|
| 1 | S3 key is generated in `presignVault` as `` `vaults/${crypto.randomUUID()}/${data.fileName}` `` | `packages/backend/src/services/vaults/presignVault/index.ts:39` | This is the only place that constructs S3 keys; it must change to the new hierarchical format. |
| 2 | `presignVault` already receives `workspaceId` (via `data.workspaceId`) and `folderId` (via `data.folderId`, nullable) | Same file, lines 15-17 | The new key format needs both values, and they are already available. |
| 3 | `deleteVault` reads `vault.s3Key` from DB to delete from S3 | `packages/backend/src/services/vaults/deleteVault/index.ts:48` | Vault delete is key-format-agnostic; no change needed. |
| 4 | `parent_folder_id` on the `folders` table has **no FK constraint** — deleting a parent does NOT cascade-delete child folders | `packages/backend/src/db/schema.ts:125` (bare uuid, no `.references()`), migration SQL line 14 (no ALTER for this column) | The delete service must recursively find and delete all descendant folders itself. |
| 5 | `vaults.folder_id` → `folders.id` has `ON DELETE CASCADE` | `schema.ts:166-168`, migration line 107 | Deleting a folder row auto-deletes its vault rows in DB, but S3 objects must be cleaned up first. |
| 6 | `folder_members.folder_id` → `folders.id` has `ON DELETE CASCADE` | `schema.ts:143-144`, migration line 103 | Folder member rows are auto-cleaned when folder row is deleted. |
| 7 | `findDescendantSizes` in `repositories/folders/index.ts:58-76` has a recursive CTE that walks `parent_folder_id` to collect all descendant folder IDs | Same file | The CTE pattern can be reused for a `findDescendantVaultS3Keys` repo function. |
| 8 | Folder routes are mounted at prefix `/workspaces/:workspaceId/folders` | `packages/backend/src/index.ts:64` | The delete endpoint will be `DELETE /:folderId` within this prefix. |
| 9 | `IDeleteVaultResponse` in shared is `{ message: string }` | `packages/shared/src/index.ts:321-323` | `IDeleteFolderResponse` will use the same shape. |
| 10 | `useApiDelete` hook exists — generic DELETE mutation wrapper | `packages/frontend/src/api/hooks/useApiDelete/index.ts` | `useDeleteFolder` hook will use it (same pattern as `useDeleteVault`). |
| 11 | VaultListItem renders a `Menu` with delete action; FolderListItem currently passes **no `actions`** to FileListItem | `VaultListItem/index.tsx:28-54`, `FolderListItem/index.tsx:16-27` | FolderListItem must be updated to pass an actions Menu with delete. |
| 12 | CreateFolderModal uses Formik + Yup + Mantine Modal | `CreateFolderModal/index.tsx` | DeleteFolderModal should follow the same pattern. |
| 13 | i18n key `files.actions.delete` already exists ("Delete") | `en.json:143` | Reusable for the Menu item label. New keys needed for the confirmation modal text. |
| 14 | Existing folder hooks construct URLs as `` `${EndpointEnum.WORKSPACES}/${workspace.id}/folders/...` `` — no folder-specific EndpointEnum entry | `useGetFolders/index.ts:23-25` | `useDeleteFolder` will follow the same URL construction pattern. |

## Behavioral Changes

- **S3 key format changes** from `vaults/{uuid}/{fileName}` to `{workspaceId}/{folderId|root}/{vaultId}/{fileName}`. Existing S3 objects become orphaned (acceptable — no production data).
- **Folder list items** gain a three-dot action menu with a "Delete" option (matching the existing vault list item pattern).
- **Clicking delete** opens a confirmation modal requiring the user to type "delete" before the action is executed. The modal warns that deletion is permanent and cannot be undone.
- **Backend accepts** `DELETE /workspaces/:workspaceId/folders/:folderId` and recursively removes the folder, all descendant folders, all contained vaults (S3 + DB), and all folder member records.

## Phase Table

| Phase | Name | Content | Plan | Depends On |
|-------|------|---------|------|------------|
| 1 | Backend | Restructure S3 key format in `presignVault`, add `IDeleteFolderResponse` to shared, add `findDescendantVaultS3Keys` + `deleteByIds` to folders repo, add `deleteFolder` service, add `DELETE /:folderId` route | [phase-1-backend/plan.md](phase-1-backend/plan.md) | — |
| 2 | Frontend | Add `useDeleteFolder` hook, `DeleteFolderModal` component with type-"delete" confirmation, `deleteFolderConfirmSchema` validation, update `FolderListItem` with Menu + delete action, add i18n keys | [phase-2-frontend/plan.md](phase-2-frontend/plan.md) | Phase 1 merged |

## Out of Scope

- Adding a FK constraint on `parent_folder_id` (separate DB migration initiative)
- Adding confirmation dialog to the existing vault delete flow
- Bulk delete (selecting multiple folders/vaults at once)
- Soft delete / trash / undo functionality
- Folder rename or move operations
- Mobile-specific UI (app is desktop-only per project rules)
