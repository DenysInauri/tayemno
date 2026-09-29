# Phase 2 — Frontend: Hooks + Components Fixes

You are executing **Phase 2** of the **Nested Folders + HomePage Fixes** initiative for the Tayemno monorepo. The repo root is at the current working directory. This phase updates all frontend hooks and components to support filtered folder queries, root-level vault queries, root-level upload, breadcrumb names, and always-visible menu items.

## Step 0 — Verify prerequisites

Phase 1 must be completed. Verify:

1. `packages/shared/src/index.ts` — `Folder` interface has `parentFolderId: string | null`.
2. `packages/shared/src/index.ts` — `ICreateFolderRequest` has `parentFolderId?: string | null`.
3. `packages/shared/src/index.ts` — `IGetFoldersRequest` interface exists with `parentFolderId?: string`.
4. `packages/shared/src/index.ts` — `IGetVaultsRequest` has `folderId?: string` and `workspaceId?: string` (both optional).
5. `packages/backend/src/db/schema.ts` — `folders` table has a `parentFolderId` column.
6. Run `npx tsc --build` in `packages/backend` — must compile with zero errors.

If any of these are wrong, STOP and report what you found — Phase 1 was not completed properly.

## Read first — in this exact order

1. `docs/nested-folders-homepage-fixes/phase-2-frontend-fixes/plan.md` — the detailed plan you will follow.
2. `docs/nested-folders-homepage-fixes/README.md` — initiative overview, decisions, verified findings, encryption model.
3. `.claude/frontend/code-style.md` — arrow functions, interface naming, form patterns, validation schemas, i18n.
4. `.claude/frontend/api-guide.md` — two-layer hook pattern, QueryKeyEnum, EndpointEnum, select + fallback.
5. `.claude/encryption-key-hierarchy.md` — key hierarchy, especially "Standalone vault (no folder)" section.
6. These existing files whose patterns you must imitate:
   - `packages/frontend/src/api/hooks/useGetFolders/index.ts` — current hook (you will modify it).
   - `packages/frontend/src/api/hooks/useGetVaults/index.ts` — current hook (you will modify it).
   - `packages/frontend/src/api/hooks/useUploadVault/index.ts` — current hook (you will modify it).
   - `packages/frontend/src/api/hooks/useApiGet/index.ts` — the GET hook factory (to understand `enabled`, `select`, query keys).
   - `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts` — `encrypt()` returns a single base64 string (sealed box, no separate nonce). `decrypt()` takes `(ciphertext, publicKey, privateKey)`.
   - `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts` — `encrypt()` returns `{ ciphertext, nonce }`.
   - `packages/frontend/src/pages/HomePage/index.tsx` — current page (you will modify it).
   - `packages/frontend/src/components/files/AddNewEntity/index.tsx` — current component (you will modify it).
   - `packages/frontend/src/components/files/UploadFileModal/index.tsx` — current component (you will modify it).
   - `packages/frontend/src/components/files/FoldersList/index.tsx` — current component (you will modify it).
   - `packages/frontend/src/contexts/AuthContext/index.tsx` — `useAuth()` provides `user`, `keyPair`, `workspace`.

## The task

Follow the plan in `docs/nested-folders-homepage-fixes/phase-2-frontend-fixes/plan.md` exactly. The steps are numbered 1–8. Execute them in order:

1. Update `useGetFolders` — accept `parentFolderId: string | null` parameter (default `null`), append query param when non-null, include in query key.
2. Update `useGetVaults` — accept `workspaceId: string` as second param, remove `enabled: !!folderId`, build URL with `folderId` or `workspaceId`.
3. Update `useUploadVault` — remove `useGetFolders` dependency, change `upload` signature to `(file, folderId, folderEncryptedKey)`. Folder path: decrypt folder key from `folderEncryptedKey`, encrypt vault key with it. Root path: encrypt vault key with `workspace.memberPublicKey` (sealed box via `AsymmetricCrypto.encrypt`), set `symmetricKeyNonce` to `null`.
4. Update `FoldersList` — pass `folderName` and `folderEncryptedKey` in React Router `location.state` when navigating.
5. Update `HomePage` — import `useLocation` and `useAuth`, read `folderName`/`folderEncryptedKey` from state, pass `folderId` to `useGetFolders`, pass `workspace!.id` to `useGetVaults`, fix breadcrumb text, pass `folderEncryptedKey` to `AddNewEntity`.
6. Update `AddNewEntity` — add `folderEncryptedKey` prop, always show both menu items (remove conditionals), pass `parentFolderId` in `createFolder.mutate`, always render `UploadFileModal`, pass `folderEncryptedKey`.
7. Update `UploadFileModal` — accept `folderId: string | null` and `folderEncryptedKey: string | null`, pass `folderEncryptedKey` to `upload()`.
8. Verify builds.

### Critical implementation details

- **Root-level upload encryption:** When `folderId` is null, encrypt the vault key with `workspace.memberPublicKey` using `AsymmetricCrypto.encrypt(vaultKey, workspace.memberPublicKey)`. This returns a single base64 string (sealed box). Set `symmetricKeyNonce` to `null`. This matches the "Standalone vault" path in `encryption-key-hierarchy.md`.
- **Folder-level upload encryption (unchanged):** When `folderId` is set, decrypt the folder key from `folderEncryptedKey` using `AsymmetricCrypto.decrypt(folderEncryptedKey, user.publicKey, keyPair.privateKey)`, then encrypt the vault key with `SymmetricCrypto.encrypt(vaultKey, folderKey)` which returns `{ ciphertext, nonce }`.
- **Query invalidation:** `usePostCreateFolder` invalidates `[QueryKeyEnum.FOLDERS]` (prefix match) — this correctly invalidates all `[QueryKeyEnum.FOLDERS, parentFolderId]` variants. Same for `usePostCreateVault` invalidating `[QueryKeyEnum.VAULTS]`.
- **`workspace!.id`** non-null assertion is safe because `HomePage` is rendered inside `ProtectedRoute` which guarantees authentication (`packages/frontend/src/App.tsx:27-31`).
- **Route state fallback:** When `location.state` is null (direct URL access), `folderName` is undefined and breadcrumb falls back to showing `folderId`. `folderEncryptedKey` is null, so root-level upload will be used even inside a folder. This is a known limitation — a `GET /folders/:id` endpoint would fix it but is out of scope.

## Explicitly forbidden in this phase

- **No backend changes.** Do not touch anything in `packages/backend/`.
- **No shared type changes.** Do not touch `packages/shared/`.
- **No new hooks or components.** Only modify existing files listed in the plan.
- **No full breadcrumb trail.** Only show "Root > CurrentFolderName", not the full ancestor chain.
- **No `GET /folders/:id` endpoint.** Out of scope.
- **No folder membership management.** Out of scope.
- **No changes to `encryption-key-hierarchy.md`.** Out of scope.
- **No changes to `.claude/` directory.**

## Hard rules

- **Arrow functions only** — no `function` keyword.
- **Interface naming** — prefix with `I` for interfaces.
- **Enum usage** — never hardcode endpoint paths or query keys. Always use `EndpointEnum` and `QueryKeyEnum`.
- **Do not commit or push.** Leave changes for review.
- **Do not run destructive git commands.**

## Verify

After completing all steps, run:

```bash
# 1. TypeScript check — must produce no errors
cd packages/frontend && npx tsc --noEmit

# 2. Vite build — must succeed
cd packages/frontend && npx vite build

# 3. Scope check
git diff --name-only
```

Expected files in the diff:

- `packages/frontend/src/api/hooks/useGetFolders/index.ts`
- `packages/frontend/src/api/hooks/useGetVaults/index.ts`
- `packages/frontend/src/api/hooks/useUploadVault/index.ts`
- `packages/frontend/src/components/files/FoldersList/index.tsx`
- `packages/frontend/src/pages/HomePage/index.tsx`
- `packages/frontend/src/components/files/AddNewEntity/index.tsx`
- `packages/frontend/src/components/files/UploadFileModal/index.tsx`

If anything outside this list appears (especially in `packages/backend/` or `packages/shared/`), investigate and undo unintended changes.

## Report

When done, summarize:

1. Which steps completed successfully.
2. The `tsc --noEmit` output (confirm zero errors).
3. The `vite build` output (confirm success).
4. The `git diff --name-only` output.
5. Any issues encountered and how you resolved them.

Then stop — the user reviews before the next phase.
