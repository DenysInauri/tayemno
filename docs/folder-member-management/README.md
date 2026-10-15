# Folder Member Management

Add the ability for admins and owners to manage folder members from the AsideContent panel. This includes listing current folder members with search and revoke access, plus an "add member" flow with bulk selection and E2EE folder key sharing.

## Decisions

1. **Add `publicKey` to `IMemberItem`** — the existing workspace members list response will include each user's public key so the frontend can encrypt folder keys for target users. Approved.
2. **Empty state at root** — when there is no `folderId` (root URL `/`), the members section shows a placeholder message ("Select a folder to view members"). Approved.
3. **New bulk endpoint** — `POST /:folderId/acl/bulk` accepting an array of `{ userId, encryptedFolderKey }` for atomic multi-user folder sharing. Approved.
4. **MultiSelect component** — Mantine `MultiSelect` for the add-member picker UI with built-in search, chips, and disabled items for already-added members. Approved.

## Verified Findings

These are facts verified by reading source code. An executing session should re-verify the exact line numbers (they may shift due to earlier phases).

### Backend

- **`folderAcls` repository** (`packages/backend/src/repositories/folderAcls/index.ts`): has `create`, `findByFolderIdAndUserId`, `findByUserIdAndWorkspaceId`, `deleteByFolderIdAndUserId`. No method to list all ACLs for a given folder.
- **`createFolderAcl` service** (`packages/backend/src/services/folders/createFolderAcl/index.ts`): verifies requester has folder access via `foldersRepo.findByIdAndUserId`, checks duplicate ACL, creates single ACL record.
- **`deleteFolderAcl` service** (`packages/backend/src/services/folders/deleteFolderAcl/index.ts`): verifies requester access, deletes ACL by folderId+userId.
- **Folder routes index** (`packages/backend/src/routes/folders/index.ts`): registers all folder routes with `authenticate` + `requirePasswordChanged` hooks. New routes get registered here.
- **Folder services barrel** (`packages/backend/src/services/folders/index.ts`): re-exports all folder services. New services get exported here.
- **`listMembers` service** (`packages/backend/src/services/members/listMembers/index.ts`): returns `IMemberItem[]` from `workspaceMembersRepo.findAllByWorkspaceId`. Does NOT include `publicKey`.
- **`workspaceMembers` repo `findAllByWorkspaceId`** (`packages/backend/src/repositories/workspaceMembers/index.ts:41-58`): selects `id, userId, role, status, adminEncryptedUserPrivateKey, createdAt, name, email` via join with `users`. Does NOT select `publicKey`.
- **`IMemberItem` shared type** (`packages/shared/src/index.ts:388-397`): `{ id, userId, name, email, role, status, adminEncryptedUserPrivateKey, createdAt }` — no `publicKey` field.
- **`folderAcls` table** (`packages/backend/src/db/schema.ts:146-166`): unique constraint on `(folderId, userId)`, cascade delete on both FKs.
- **`mapTimestamps` utility** (`packages/backend/src/utils/mapTimestamps/index.ts`): converts `Date` objects to ISO strings. Used by all services returning DB rows.
- **`HttpError` utility** (`packages/backend/src/utils/httpError/index.ts`): `new HttpError(statusCode, message)`. Used for 403/409 errors.

### Frontend

- **AsideContent** (`packages/frontend/src/components/layout/AppShell/AsideContent/index.tsx`): 17 lines, placeholder with `t("aside.title")`. No `useParams`, no `folderId`.
- **AppShell** (`packages/frontend/src/components/layout/AppShell/index.tsx`): renders `{showAside && <AsideContent />}` — no props passed.
- **UsersPage** (`packages/frontend/src/pages/UsersPage/index.tsx`): 105 lines. Pattern for member list + search + modals. Uses `useGetMembers`, `useMemo` for filtering.
- **UsersTable** (`packages/frontend/src/pages/UsersPage/UsersTable/index.tsx`): 85 lines. Virtualized with `@tanstack/react-virtual`, `ROW_HEIGHT = 48`, sticky header, padding rows.
- **MemberRowActions** (`packages/frontend/src/pages/UsersPage/UsersTable/MemberRowActions/index.tsx`): 55 lines. 3-dot menu pattern with `Menu` + `ActionIcon` + `IconDotsVertical`.
- **`useGetMembers`** (`packages/frontend/src/api/hooks/useGetMembers/index.ts`): uses `useQuery` with `QueryKeyEnum.MEMBERS`.
- **`useGetFolderKeyAsMember`** (`packages/frontend/src/api/hooks/useGetFolderKeyAsMember/index.ts`): decrypts folder key via ACL (`AsymmetricCrypto.decrypt`) or parent wrapping (`SymmetricCrypto.decrypt`). Has in-memory cache. Does NOT handle admin path (decrypting `folder.encryptedSymmetricKey` via workspace admin key).
- **`EndpointEnum`** (`packages/frontend/src/enums/api/EndpointEnum/index.ts`): includes `FOLDERS = "/folders"`, `MEMBERS = "/members"`, `WORKSPACES = "/workspaces"`.
- **`QueryKeyEnum`** (`packages/frontend/src/enums/api/QueryKeyEnum/index.ts`): includes `MEMBERS`, `FOLDERS`. No `FOLDER_MEMBERS` key.
- **`AuthContext`** (`packages/frontend/src/contexts/AuthContext/index.tsx`): exposes `user`, `keyPair`, `workspace`, `workspaceName`. `workspace` has `encryptedAdminPrivateKey` and `adminPublicKey`.
- **Crypto utilities**: `AsymmetricCrypto` (sealed box encrypt/decrypt), `SymmetricCrypto` (XChaCha20-Poly1305 encrypt/decrypt/generateKey) in `packages/frontend/src/utils/crypto/`.

### Crypto Flow for Adding a Member to a Folder

1. Admin gets the folder's symmetric key. Two paths:
   - **ACL path**: if admin has ACL → `AsymmetricCrypto.decrypt(folder.aclEncryptedFolderKey, keyPair.publicKey, keyPair.privateKey)`
   - **Admin path**: decrypt workspace admin private key → `AsymmetricCrypto.decrypt(workspace.encryptedAdminPrivateKey, keyPair.publicKey, keyPair.privateKey)` → then `AsymmetricCrypto.decrypt(folder.encryptedSymmetricKey, workspace.adminPublicKey, adminPrivateKey)`
2. For each target user: `AsymmetricCrypto.encrypt(folderKey, targetUser.publicKey)` → produces `encryptedFolderKey`.
3. Send array of `{ userId, encryptedFolderKey }` to bulk endpoint.

## Behavioral Changes

- Admin/owner users see a "Members" section in the right aside panel when viewing any folder.
- At root (`/`), the members section shows an empty-state message.
- Admin/owner can search folder members by name or email.
- Admin/owner can revoke a member's folder access via 3-dot menu.
- Admin/owner can add workspace members to a folder using a MultiSelect picker. Already-added members appear disabled.
- Adding a member encrypts the folder key with the target user's public key (E2EE).
- The workspace members list API response now includes `publicKey` for each member.

## Phase Table

| # | Name | plan.md | Depends On |
|---|------|---------|------------|
| 1 | [Backend — folder member APIs](phase-1-backend-apis/plan.md) | Add `publicKey` to `IMemberItem`; new `listFolderMembers` endpoint; new `bulkCreateFolderAcl` endpoint | — |
| 2 | [Frontend — display & revoke](phase-2-frontend-display-revoke/plan.md) | `FolderMembersSection` with virtualized list, search, 3-dot menu, revoke access, empty state | Phase 1 |
| 3 | [Frontend — add members with crypto](phase-3-frontend-add-members/plan.md) | Add-member button + MultiSelect picker, folder key encryption, bulk POST | Phase 1, Phase 2 |

## Out of Scope

- Audit logs and folder restrictions/policies (future aside features).
- Root-level member management (root shows empty state only).
- Notification or email when a user is added to or removed from a folder.
- Displaying inherited ACL access from parent folders.
- Mobile-specific responsive styles.
- Confirmation modal for revoke access (can be added later).
- Changing a folder member's role/permissions (ACLs are binary: access or no access).
