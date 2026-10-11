# Zero-Knowledge Folder Hierarchy & Key Wrapping

Refactors the folder encryption architecture from a flat per-user sealed-box model (every folder key independently encrypted per user in `folder_members`) to a parent-child key wrapping chain with ACL-based subtree access. Each folder's key is wrapped by its parent folder's key, creating a chain from root to leaf. Access is granted via an ACL table where the folder key is sealed-boxed with the recipient's public key. Admins retain a direct admin master copy of every folder key for O(1) access without chain traversal. Folder moves become efficient: re-wrap one key with the new parent instead of re-encrypting all contents.

## Decisions

1. **No data migration** -- No production data exists. Schema changes are pushed with `npm run db:push`. Approved.
2. **Admin master copy retained** -- `folders.encrypted_symmetric_key` (sealed box with workspace admin public key) is kept on ALL folders. Admins/owners can decrypt any folder key directly without traversing the parent-child chain. The new `wrapped_key` column is added alongside it for chain traversal by non-admin shared users. Approved.
3. **Rename `folder_members` to `folder_acls`** -- Same structure but different semantics (subtree access grant vs. per-folder access). A rename signals the conceptual change clearly. Approved.
4. **Backend does subtree expansion** -- When a non-admin user has an ACL entry on folder X, the backend returns X and all its descendants (via recursive CTE). Admins/owners see all workspace folders. This limits information leakage vs. returning everything. Approved.
5. **No per-folder roles** -- An ACL entry means full access to the subtree. No `viewer`/`editor`/`admin` distinction. Can be added later as a non-breaking schema change. Approved.
6. **Standalone vaults unchanged** -- Files at workspace root (not in any folder) keep the current sealed-box pattern with workspace member public key. No change needed. Approved.

## Verified Findings

### Schema (current)

- **`folders` table** (`packages/backend/src/db/schema.ts:120-138`): Has `encryptedSymmetricKey` (admin master copy, sealed box with workspace admin public key), `encryptedName`, `nameNonce`, `parentFolderId` (nullable, self-referential for hierarchy). No `wrappedKey` or `wrappedKeyNonce` columns.
- **`folder_members` table** (`schema.ts:140-160`): Per-user encrypted copy of folder key (`encryptedSymmetricKey` as sealed box with user public key). Unique on `(folderId, userId)`. CASCADE DELETE on both FKs.
- **`vaults` table** (`schema.ts:162-189`): `encryptedSymmetricKey` + `symmetricKeyNonce` (null for standalone vaults using sealed box, non-null for folder vaults using XChaCha20-Poly1305).

### Backend data access (current)

- **All folder queries return the per-user copy** from `folder_members`, NOT the admin copy from `folders`. Confirmed at `repositories/folders/index.ts:17` (`findByIdAndUserId`), `:50` (`findByWorkspaceIdAndUserId`), `:116-122` (`findBreadcrumbs` recursive CTE), `:157` (`findAllByUser`).
- **`createFolder` service** (`services/folders/createFolder/index.ts:40-57`): Inserts into `folders` (admin copy) and `folder_members` (user copy). Response replaces admin key with user key (line 54-57).
- **Vault raw SQL references `folder_members`** in 3 places: `repositories/vaults/index.ts:86` (`findByFolderAndUser`), `:103`, `:127` (`findAllByWorkspaceAndUser`). These must be updated to `folder_acls`.
- **`moveVault` service** (`services/vaults/moveVault/index.ts:22-43`): References `folderMembersRepo.findByFolderIdAndUserId` for access checks.
- **`createVault` service** (`services/vaults/createVault/index.ts:18`): References `folderMembersRepo` for access checks.
- **Vault `deleteVault` service**: References `folderMembersRepo` for access checks.

### Frontend crypto (current)

- **Library**: `libsodium-wrappers-sumo` -- XChaCha20-Poly1305 for symmetric (`utils/crypto/SymmetricCrypto`), `crypto_box_seal` for asymmetric (`utils/crypto/AsymmetricCrypto`).
- **`useDecryptFolder`** (`api/hooks/useDecryptFolder/index.ts:13-17`): Decrypts `folder.encryptedSymmetricKey` using user's keypair via `AsymmetricCrypto.decrypt`. This decrypts the per-user copy returned by the backend.
- **`useGetFolderKey`** (`api/hooks/useGetFolderKey/index.ts:10-40`): Same pattern, with an in-memory `Map<string, Promise<string>>` cache (line 8).
- **`useDecryptVault`** (`api/hooks/useDecryptVault/index.ts:46-77`): For folder vaults, gets folder key via `useGetFolderKey`, then `SymmetricCrypto.decrypt` for vault key. For standalone vaults, sealed box with workspace member key.
- **Folder creation** (`AddNewEntity/index.tsx:44-51`): Generates folder key, sealed-box encrypts with admin public key (`encryptedSymmetricKey`) AND user public key (`memberEncryptedSymmetricKey`). No parent-child wrapping.
- **Folder upload** (`UploadContext/index.tsx:315-337`): Same dual-copy pattern for each folder created during folder upload.
- **`useLazyFolderTree`** (`api/hooks/useLazyFolderTree/index.ts:21-107`): Lazy-loads folder tree per parent. Decrypts each folder independently via `useDecryptFolder`.
- **`DownloadContext`** (`contexts/DownloadContext/index.tsx:55-56`): Uses `useDecryptFolder` and `useDecryptVault` for folder ZIP downloads.
- **`AuthContext`** (`contexts/AuthContext/index.tsx:31-36`): Stores `workspace: IWorkspaceData` which includes `encryptedAdminPrivateKey` (null for members), `encryptedMemberPrivateKey`, `role`.

### Existing patterns to follow

- **Three-layer backend**: routes (`routes/<domain>/<endpoint>/index.ts`) -> services (`services/<domain>/<function>/index.ts`) -> repositories (`repositories/<domain>/index.ts`). Verified in `backend/architecture.md`.
- **Two-layer frontend hooks**: generic (`useApiGet`/`useApiPost`/etc.) -> specific (`useFolders`/`usePostCreateFolder`/etc.). Verified in `frontend/api-guide.md`.
- **Vault move** is the closest existing pattern for folder move: `useMoveVault` (frontend), `moveVault` service + route (backend). Uses PATCH verb, re-encrypts key client-side, sends new encrypted key to server.
- **Query invalidation**: Uses `QueryKeyEnum` enum values with workspace/folder IDs. `QueryKeyEnum.FOLDERS`, `QueryKeyEnum.VAULTS`, `QueryKeyEnum.FOLDER_TREE`, `QueryKeyEnum.BREADCRUMBS`.
- **Shared types**: All request/response interfaces in `packages/shared/src/index.ts`. Entity types (`Folder`, `Vault`, etc.) and `New*` types for inserts.

## Behavioral Changes

- Folder keys are now wrapped by their parent folder's key (parent-child chain). Root folder keys remain sealed-boxed with workspace admin public key.
- The `folder_members` table is replaced by `folder_acls`. Existing `folder_members` data is dropped (no production data).
- Admins/owners decrypt folder keys via the admin master copy (same sealed box pattern as before, direct access).
- Non-admin users with ACL entries decrypt their entry-point folder key via sealed box, then traverse the wrappedKey chain for descendants.
- Backend `getAllFolders` response now includes both `folders` and `acls` arrays.
- Folder creation sends `wrappedKey`/`wrappedKeyNonce` (parent-wrapped key) in addition to the admin copy and ACL entry.
- Moving a folder re-wraps its key with the new parent's key. No re-encryption of child folders or files.
- `Folder` type gains `wrappedKey: string | null` and `wrappedKeyNonce: string | null` fields.

## Phase Table

| Phase | Name | Plan | Depends On |
|-------|------|------|------------|
| 1 | Schema + Backend | [phase-1-schema-backend/plan.md](phase-1-schema-backend/plan.md) | -- |
| 2 | Client Crypto + Integration | [phase-2-client-crypto-integration/plan.md](phase-2-client-crypto-integration/plan.md) | Phase 1 |
| 3 | Move Folder UI | [phase-3-move-folder-ui/plan.md](phase-3-move-folder-ui/plan.md) | Phase 2 |

## Out of Scope

- Sharing UI (user search, invitation modal, manage access dialog) -- backend ACL endpoints are in Phase 1, but frontend sharing UI is a separate initiative
- Per-folder roles/permissions (viewer/editor/admin distinction in ACL)
- Workspace invitation flow (separate from folder-level sharing)
- Key rotation (re-encrypting wrapped keys with new folder keys)
- Revocation cascade (re-wrapping child keys when revoking ACL to prevent cached access)
- Standalone vault encryption changes (keep current sealed-box pattern)
- Encrypted folder metadata beyond name (only name is encrypted)
- Mobile responsive styles (desktop/tablet only per project rules)
- Breadcrumb path display for partial tree access (member sees ACL-granted folder as root; ancestor path not shown)
