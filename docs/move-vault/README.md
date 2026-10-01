# Move Vault Between Folders

Move a vault from one folder to another (or to/from workspace root). The vault's encrypted content stays in S3 untouched; only the vault symmetric key is re-encrypted with the destination folder's key (or workspace member public key for root).

## Decisions

1. **S3 key format** — Simplify to `${workspaceId}/${uuid}/${fileName}`. No folder segment. Applied in `presignVault` for all new vaults. Existing keys are unaffected (stored in `vaults.s3Key`). Approved.
2. **Confirm dialog UX** — Single modal with TreeSelect + warning text + Cancel/Move buttons. Matches `DeleteFolderModal` pattern. No two-step flow. Approved.
3. **Root in TreeSelect** — Synthetic "Files" root node (`value: "root"`) so users can move vaults to workspace root (`targetFolderId: null`). Approved.

## Verified Findings

These are the facts the plan relies on. An executing session should re-verify, not trust blindly.

| Finding | File | Line(s) | Why it matters |
|---------|------|---------|----------------|
| `VaultListItem` has Download + Delete actions, `loading={isDownloading \|\| isDeleting}` | `packages/frontend/src/components/files/VaultListItem/index.tsx` | 34, 40-52 | New "Move" action goes here; loading state extends |
| `useApiPatch<TRequest, TResponse>` exists | `packages/frontend/src/api/hooks/useApiPatch/index.ts` | 1-15 | Reuse for move mutation |
| No PATCH/PUT routes on backend yet | `packages/backend/src/routes/` | — | This is the first PATCH route |
| Mantine `^7.15.0` installed; `TreeSelect` available | `packages/frontend/package.json` | — | Component for folder picker |
| `TreeSelect` expects `TreeNodeData[]`: `{ value, label, children? }` | Mantine docs | — | Shapes the tree endpoint response or frontend transform |
| `getFolders` returns single-level children only | `packages/backend/src/services/folders/getFolders/index.ts` | 10-45 | Need new recursive tree endpoint |
| `findAncestors` recursive CTE exists (ancestors only, not descendants) | `packages/backend/src/repositories/folders/index.ts` | 5-25 | Pattern to follow for full-tree CTE |
| Vault key encrypt: folder path uses `SymmetricCrypto.encrypt(vaultKey, folderKey)` → `{ciphertext, nonce}` | `packages/frontend/src/api/hooks/useUploadVault/index.ts` | 30-33 | Re-encrypt pattern for folder destination |
| Vault key encrypt: root path uses `AsymmetricCrypto.encrypt(vaultKey, memberPublicKey)` → `ciphertext`, nonce is null | `packages/frontend/src/api/hooks/useUploadVault/index.ts` | 42-45 | Re-encrypt pattern for root destination |
| Vault key decrypt: folder path uses `SymmetricCrypto.decrypt({nonce, ciphertext}, folderKey)` | `packages/frontend/src/api/hooks/useDownloadVault/index.ts` | 30-33 | Decrypt pattern for folder source |
| Vault key decrypt: root path uses `AsymmetricCrypto.decrypt(encryptedKey, memberPubKey, memberPrivKey)` | `packages/frontend/src/api/hooks/useDownloadVault/index.ts` | 36-46 | Decrypt pattern for root source |
| `getFolderKey(folderId, workspaceId, userPubKey, userPrivKey)` fetches + decrypts + caches folder key | `packages/frontend/src/services/folderKeyService/index.ts` | 9-31 | Reuse for destination folder key |
| S3 key currently `${workspaceId}/${folderId ?? "root"}/${uuid}/${fileName}` | `packages/backend/src/services/vaults/presignVault/index.ts` | 39-40 | Changing to `${workspaceId}/${uuid}/${fileName}` |
| Vaults repo has no `update` method | `packages/backend/src/repositories/vaults/index.ts` | 1-54 | Need to add `updateMove` |
| `deleteFolder` finds S3 keys via DB query (`findDescendantVaultS3Keys`), not by parsing S3 paths | `packages/backend/src/services/folders/deleteFolder/index.ts` | 21 | Confirms S3 path change is safe |
| `DeleteFolderModal` is the closest modal sibling (Formik, title, description, cancel/confirm) | `packages/frontend/src/components/files/DeleteFolderModal/index.tsx` | 1-115 | Pattern for `MoveVaultModal` |
| `FolderListItem` uses `useDisclosure` to control modal open/close | `packages/frontend/src/components/files/FolderListItem/index.tsx` | 24-25 | Pattern for modal state in `VaultListItem` |
| i18n keys follow `files.{feature}.{field}` | `packages/frontend/src/i18n/locales/en.json` | 100-159 | Naming for move keys |
| Vault routes barrel: `packages/backend/src/routes/vaults/index.ts` registers 5 routes | `packages/backend/src/routes/vaults/index.ts` | 1-17 | Register new `moveVaultRoute` here |
| Vault services barrel: `packages/backend/src/services/vaults/index.ts` exports 5 services | `packages/backend/src/services/vaults/index.ts` | 1-5 | Export new `moveVault` here |
| Folder routes barrel: `packages/backend/src/routes/folders/index.ts` registers 5 routes | `packages/backend/src/routes/folders/index.ts` | 1-17 | Register new `getFolderTreeRoute` here |
| Folder services barrel: `packages/backend/src/services/folders/index.ts` exports 5 services | `packages/backend/src/services/folders/index.ts` | 1-5 | Export new `getFolderTree` here |
| `folders.parentFolderId` is nullable (root folders have null) | `packages/backend/src/db/schema.ts` | ~130 | Recursive CTE base case |
| `folderMembers` JOIN is used everywhere to scope by user access | `packages/backend/src/repositories/folders/index.ts` | 78-111 | Tree query must also JOIN folder_members |

## Behavioral Changes

- `VaultListItem` gains a "Move" menu action.
- Clicking "Move" fetches the full folder tree, showing a loading spinner on the ActionIcon.
- A modal opens with a `TreeSelect` (folder tree + "Files" root node). The vault's current folder is disabled.
- Warning text is always visible: "Everyone who has access to the current folder will lose access to this file."
- Confirming re-encrypts the vault symmetric key client-side and PATCHes the backend.
- S3 presign keys for **new** vaults no longer include folder ID in the path.

## Phase Table

| Phase | Name | Plan | Depends On |
|-------|------|------|------------|
| 1 | Backend: folder tree + move vault + S3 key simplification | [phase-1-backend/plan.md](phase-1-backend/plan.md) | — |
| 2 | Frontend: move vault UI | [phase-2-frontend/plan.md](phase-2-frontend/plan.md) | Phase 1 |

## Out of Scope

- Moving folders (only vaults move)
- Batch/multi-select move
- Drag-and-drop move
- S3 object relocation (key path stays where it was uploaded)
- Sharing/permission management (future feature per `encryption-key-hierarchy.md:49`)
- Mobile-specific styles (desktop-only app per CLAUDE.md)
- Migrating existing S3 keys to new format (dev-only data, can be wiped)
