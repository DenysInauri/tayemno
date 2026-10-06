# Folder Upload

Add the ability to upload an entire folder (with nested subfolders) from the browser's directory picker. The system recreates the folder tree on the backend, uploads all files with end-to-end encryption, and shows a single aggregated progress item in the TransferPanel. Cancellation cascade-deletes the root folder and all its descendants.

## Decisions

1. **File upload concurrency:** Parallel with a concurrency limit (3 simultaneous file uploads within a folder upload). Approved.
2. **Button placement:** Separate "Upload folder" button in the `AddNewEntity` group, alongside the existing "Upload file" and "Add folder" buttons. Approved.
3. **Tab close behavior:** Accept partial data. No `beforeunload` handler. If the tab closes mid-upload, the partially created folder remains and the user can delete it manually via the existing delete-folder UI. Approved.
4. **Nested folder structure:** Preserve the full directory structure. If the user uploads `photos/vacation/2024/img.jpg`, three nested folders are created. Approved.

## Verified Findings

These are the facts the plan depends on. A cold session should re-verify each file/line reference before relying on it.

### Frontend — Current upload flow

| What | File | Lines | Detail |
|------|------|-------|--------|
| File input | `packages/frontend/src/components/files/AddNewEntity/index.tsx` | 93-99 | `<input type="file" multiple>` — no `webkitdirectory`. Files are looped and each passed to `upload(file, folderId)`. |
| Upload context | `packages/frontend/src/contexts/UploadContext/index.tsx` | 1-207 | Manages individual uploads. Each file gets its own `ITransferItem {id, fileName, progress}` and `AbortController`. |
| `buildVaultEncryptionKey` | `UploadContext/index.tsx` | 50-81 | Reads `claudeState.foldersById[folderId].symmetricKey`. **Newly created folders are not in this cache until CLAUDE_STATE is invalidated and refetched.** |
| TransferAlert | `packages/frontend/src/components/files/TransferAlert/index.tsx` | 1-77 | Renders flat `ITransferItem[]`. Each item: fileName + progress bar + cancel (X) button. Bottom: "Cancel all" button. |
| TransferPanel | `packages/frontend/src/components/files/TransferPanel/index.tsx` | 1-54 | Fixed bottom-right container. Shows `TransferAlert` for uploads and downloads separately. |
| `ITransferItem` | `TransferAlert/index.tsx` | 12-16 | `{ id: string; fileName: string; progress: number; }` — exported, used by both Upload and Download contexts. |
| `uploadWithProgress` | `packages/frontend/src/utils/uploadWithProgress/index.ts` | 1-47 | XHR-based PUT with progress callback and AbortSignal support. |
| `StreamCrypto.encryptFile` | `packages/frontend/src/utils/crypto/StreamCrypto/index.ts` | 10-60 | XChaCha20-Poly1305 stream encryption, 64KB chunks, progress callback, AbortSignal. |
| `ILocalFolder` | `packages/frontend/src/types/local.ts` | 1-8 | `{ id, parentFolderId, workspaceId, name, symmetricKey, createdAt, updatedAt }` — `symmetricKey` is the decrypted hex key. |
| i18n keys | `packages/frontend/src/i18n/locales/en.json` | 110-128 | `files.uploadFileButton`, `files.addFolderButton`, `files.uploadAlert.title`, `files.uploadAlert.cancelAll`. |

### Frontend — Folder creation flow

| What | File | Lines | Detail |
|------|------|-------|--------|
| Folder creation (component) | `AddNewEntity/index.tsx` | 37-61 | Generates symmetric key, encrypts with `workspace.adminPublicKey` (admin) and `user.publicKey` (member), encrypts name, calls `createFolder.mutateAsync()`. |
| `usePostCreateFolder` | `packages/frontend/src/api/hooks/usePostCreateFolder/index.ts` | 1-20 | `POST /workspaces/{workspaceId}/folders`. Request: `ICreateFolderRequest`. Response: `ICreateFolderResponse { folder: Folder }`. |

### Backend — Relevant services

| What | File | Lines | Detail |
|------|------|-------|--------|
| `createFolder` service | `packages/backend/src/services/folders/createFolder/index.ts` | 12-60 | Verifies workspace membership, verifies parent folder access if `parentFolderId` provided, inserts folder, creates `folderMember` record. Returns folder with member's `encryptedSymmetricKey`. |
| `deleteFolder` service (cascade) | `packages/backend/src/services/folders/deleteFolder/index.ts` | 8-44 | Verifies user access on root folder only, uses recursive CTE to find all descendant vault S3 keys + folder IDs, deletes S3 objects in batches of 1000 (best-effort), deletes all descendant folders (cascading vault FK deletion). |
| `presignVault` service | `packages/backend/src/services/vaults/presignVault/index.ts` | 1-51 | Verifies access (folder or workspace), generates random S3 key, creates presigned PUT URL (1hr expiry). |
| `createVault` service | `packages/backend/src/services/vaults/createVault/index.ts` | 1-55 | Verifies access, inserts vault record with all encrypted fields. |

### Key encryption insight

Folder symmetric keys are encrypted asymmetrically (with `adminPublicKey` and `user.publicKey`) — they are **independent of the parent folder's key**. Creating a child folder does NOT require the parent folder's symmetric key. However, encrypting a vault's key for storage inside a folder DOES require that folder's symmetric key (symmetric encryption via `SymmetricCrypto.encrypt`).

### No batch endpoints

Backend only supports single-item creation for folders and vaults. No batch/bulk endpoints exist.

## Behavioral Changes

1. A new "Upload folder" button appears in the `AddNewEntity` button group.
2. Clicking it opens the browser's native directory picker (via `webkitdirectory`).
3. After selecting a folder, a single item appears in the TransferPanel showing the root folder name and aggregated progress across all files.
4. The folder tree is processed depth-first: at each folder, create it, upload its direct files (up to 3 concurrent), then recurse into child subfolders. Folder creation and DFS traversal are sequential; only file uploads within a single folder are concurrent.
5. Canceling a folder upload aborts all in-progress file uploads and cascade-deletes the root created folder.
6. Empty subdirectories are NOT created (browser `webkitdirectory` only returns files, not empty directories — this is a known browser limitation).
7. If the user closes the tab mid-upload, partially created data remains. The user can manually delete the folder.

## Phase Table

| # | Name | Plan | Depends On |
|---|------|------|------------|
| 1 | Folder Upload | [phase-1-folder-upload/plan.md](phase-1-folder-upload/plan.md) | — |

## Out of Scope

- Backend batch endpoints for folders or vaults.
- Mobile support (project is desktop/tablet only per CLAUDE.md).
- Drag-and-drop folder upload.
- `beforeunload` handler or automatic cleanup on tab close.
- Download folder as zip.
- Progress persistence across page reloads.
- Filtering hidden files (`.DS_Store`, etc.) — pass through as-is.
- Empty directory creation (browser API limitation).
