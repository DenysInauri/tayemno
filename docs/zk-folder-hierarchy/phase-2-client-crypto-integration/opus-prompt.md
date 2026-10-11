# Phase 2 -- Client Crypto + Integration

You are implementing Phase 2 of the Zero-Knowledge Folder Hierarchy initiative for the Tayemno monorepo. Working from the repo root at `/Users/inaurifam/Desktop/tayemno`. The frontend is at `packages/frontend/`.

## Step 0 -- Verify prerequisites

Phase 1 must be merged. Verify these files exist and contain the expected changes:

1. `packages/backend/src/db/schema.ts` -- the `folders` table must have `wrappedKey` and `wrappedKeyNonce` columns. The `folderAcls` table must exist (replacing `folderMembers`).
2. `packages/shared/src/index.ts` -- `Folder` interface must have `wrappedKey: string | null` and `wrappedKeyNonce: string | null`. `FolderAcl` and `NewFolderAcl` interfaces must exist. `ICreateFolderRequest` must have `wrappedKey`, `wrappedKeyNonce`, `aclEncryptedFolderKey` fields. `IGetAllFoldersResponse` must have `acls: FolderAcl[]`.
3. `packages/backend/src/repositories/folderAcls/index.ts` -- must exist with `create`, `findByFolderIdAndUserId`, `findByUserId`, `deleteByFolderIdAndUserId`.
4. `packages/backend/src/repositories/folderMembers/` -- must NOT exist (deleted in Phase 1).

If any of these are missing, STOP and report. Do not improvise.

## Read first, in this exact order

1. `docs/zk-folder-hierarchy/phase-2-client-crypto-integration/plan.md` -- the plan you must follow exactly.
2. `docs/zk-folder-hierarchy/README.md` -- context, decisions, verified findings, scope boundaries.
3. `.claude/frontend/code-style.md` -- arrow functions, I-prefixed interfaces, folder structure, validation schemas.
4. `.claude/frontend/api-guide.md` -- two-layer hook pattern, QueryKeyEnum, EndpointEnum.
5. `packages/shared/src/index.ts` -- the updated shared types from Phase 1.
6. `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts` -- the symmetric encrypt/decrypt you'll wrap in KeyWrapping.
7. `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts` -- the sealed box encrypt/decrypt for admin key path.
8. `packages/frontend/src/api/hooks/useGetFolderKey/index.ts` -- current hook you will rewrite.
9. `packages/frontend/src/api/hooks/useDecryptFolder/index.ts` -- current hook you will rewrite.
10. `packages/frontend/src/api/hooks/useDecryptVault/index.ts` -- verify no changes needed.
11. `packages/frontend/src/components/files/AddNewEntity/index.tsx` -- folder creation you will update.
12. `packages/frontend/src/contexts/UploadContext/index.tsx` -- folder upload you will update.
13. `packages/frontend/src/contexts/AuthContext/index.tsx` -- understand `IAuthContext` shape, `workspace.encryptedAdminPrivateKey`, `workspace.role`.
14. `packages/frontend/src/api/hooks/useFolders/index.ts` -- verify no changes needed.
15. `packages/frontend/src/api/hooks/useBreadcrumbs/index.ts` -- verify no changes needed.
16. `packages/frontend/src/contexts/DownloadContext/index.tsx` -- verify no changes needed.

## The task

Follow the plan exactly. In summary:

1. **Create `KeyWrapping` utility** (`utils/crypto/KeyWrapping/index.ts`): `wrapWithParent(childKey, parentKey)` returns `{wrappedKey, wrappedKeyNonce}`. `unwrapWithParent(wrappedKey, nonce, parentKey)` returns the child key. Thin wrappers around `SymmetricCrypto.encrypt/decrypt`.

2. **Create `KeyChainResolver` utility** (`utils/crypto/KeyChainResolver/index.ts`): Pure function `resolveAllFolderKeys(params)` that takes arrays of `Folder` + `FolderAcl` + user keypair + workspace admin keypair, and returns `Map<string, string>` (folderId -> decrypted key). Algorithm: for each folder, try admin path (decrypt admin master copy), then ACL path (decrypt ACL entry), then chain path (resolve parent key recursively, unwrap child with parent key). Also export `buildDecryptedTree(params)` that resolves keys then decrypts folder names.

3. **Update `useGetFolderKey`**: Admin/owner path decrypts `folder.encryptedSymmetricKey` via workspace admin private key. Member path throws for now (full member support requires tree context from sharing initiative).

4. **Update `useDecryptFolder`**: Same dual path. Cache the decrypted admin private key in a `useRef` to avoid redundant decryption across folders in a list.

5. **Verify `useDecryptVault`**: Should work without changes since it calls `useGetFolderKey` which is updated.

6. **Update `AddNewEntity` folder creation**: Generate `wrappedKey`/`wrappedKeyNonce` when creating a subfolder (wrap new folder key with parent key via `KeyWrapping.wrapWithParent`). Root folders pass `null` for both. Rename `memberEncryptedSymmetricKey` to `aclEncryptedFolderKey` in the request body.

7. **Update `UploadContext` folder creation**: Same wrapping logic in `processFolder`. Pass `parentKey` through recursion so child folders can be wrapped without re-fetching the parent key. Update the initial call to resolve the parent key before entering `processFolder`.

8. **Verify `useFolders`, `useBreadcrumbs`, `DownloadContext`**: These call `useDecryptFolder`/`useDecryptVault` and should work automatically with the updated hooks.

## Explicitly forbidden in this phase

- Do NOT create any new UI components, modals, or pages.
- Do NOT implement the folder move UI (that is Phase 3).
- Do NOT modify `MoveVaultModal` or `FolderListItem`.
- Do NOT modify `useLazyFolderTree` (Phase 3).
- Do NOT add sharing UI or user management features.
- Do NOT modify any backend files.
- Do NOT install new npm dependencies.
- Do NOT add i18n keys.

## Hard rules

- Arrow functions only -- no `function` keyword.
- Interfaces prefixed with `I` (e.g., `IWrappedKey`, `IResolverParams`).
- Folder-based file structure: `UtilityName/index.ts`.
- Do NOT commit or push.
- Do NOT run destructive git commands.
- Do NOT modify files outside `packages/frontend/`.

## Verify

Run these commands after implementation:

```bash
# Frontend must build
npm run build -w packages/frontend

# TypeScript must compile
npx tsc --noEmit -p packages/frontend/tsconfig.json
```

Check `git diff --stat` -- only these paths should appear:

**New:**
- `packages/frontend/src/utils/crypto/KeyWrapping/index.ts`
- `packages/frontend/src/utils/crypto/KeyChainResolver/index.ts`

**Modified:**
- `packages/frontend/src/api/hooks/useGetFolderKey/index.ts`
- `packages/frontend/src/api/hooks/useDecryptFolder/index.ts`
- `packages/frontend/src/components/files/AddNewEntity/index.tsx`
- `packages/frontend/src/contexts/UploadContext/index.tsx`

Nothing in `packages/backend/` should appear. No new components or modals should appear.

## Report

When done, summarize:
1. Exact files created/modified with line counts.
2. Whether `npm run build` succeeded.
3. Whether `tsc --noEmit` passed.
4. Which files you verified needed NO changes (useDecryptVault, useFolders, useBreadcrumbs, DownloadContext).
5. Any issues encountered and how they were resolved.
6. Any deviations from the plan (with justification).

Then stop -- the user reviews before Phase 3.
