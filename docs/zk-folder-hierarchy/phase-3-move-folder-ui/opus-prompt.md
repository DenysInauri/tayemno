# Phase 3 -- Move Folder UI

You are implementing Phase 3 of the Zero-Knowledge Folder Hierarchy initiative for the Tayemno monorepo. Working from the repo root at `/Users/inaurifam/Desktop/tayemno`. The frontend is at `packages/frontend/`.

## Step 0 -- Verify prerequisites

Phases 1 and 2 must be merged. Verify:

1. `packages/frontend/src/utils/crypto/KeyWrapping/index.ts` -- must exist with `wrapWithParent` and `unwrapWithParent` exports.
2. `packages/frontend/src/utils/crypto/KeyChainResolver/index.ts` -- must exist.
3. `packages/frontend/src/api/hooks/useGetFolderKey/index.ts` -- must use the admin key path (checks `workspace.encryptedAdminPrivateKey`).
4. `packages/frontend/src/api/hooks/useDecryptFolder/index.ts` -- must use the admin key path.
5. `packages/shared/src/index.ts` -- must have `IMoveFolderRequest` and `IMoveFolderResponse` interfaces.
6. `packages/backend/src/routes/folders/moveFolder/index.ts` -- backend move endpoint must exist (PATCH `/:folderId/move`).

If any of these are missing, STOP and report. Do not improvise.

## Read first, in this exact order

1. `docs/zk-folder-hierarchy/phase-3-move-folder-ui/plan.md` -- the plan you must follow exactly.
2. `docs/zk-folder-hierarchy/README.md` -- context, decisions, scope boundaries.
3. `.claude/frontend/code-style.md` -- arrow functions, I-prefixed interfaces, folder structure.
4. `.claude/frontend/ui-guide.md` -- wrapper component patterns, SizeEnum.
5. `packages/frontend/src/api/hooks/useMoveVault/index.ts` -- the pattern to follow for `useMoveFolder`.
6. `packages/frontend/src/components/files/MoveVaultModal/index.tsx` -- the pattern to follow for `MoveFolderModal`.
7. `packages/frontend/src/components/files/FolderListItem/index.tsx` -- the component you will modify to add the Move action.
8. `packages/frontend/src/api/hooks/useLazyFolderTree/index.ts` -- the tree hook used by the modal. Verify it works.
9. `packages/frontend/src/components/files/VaultListItem/index.tsx` -- reference for how vault move action is wired (context menu pattern).
10. `packages/frontend/src/utils/crypto/KeyWrapping/index.ts` -- the wrapping utility you will use.
11. `packages/frontend/src/api/hooks/useGetFolderKey/index.ts` -- the key resolution hook you will use.
12. `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` -- query keys for invalidation.
13. `packages/frontend/src/i18n/locales/` -- check existing locale files for structure and existing keys.

## The task

Follow the plan exactly. In summary:

1. **Create `useMoveFolder` hook** (`api/hooks/useMoveFolder/index.ts`): Takes an `ILocalFolder` and `targetFolderId` (string | null). Gets the folder's symmetric key from the folder object. If target is a folder, wraps the key with `KeyWrapping.wrapWithParent(folderKey, targetKey)`. If target is root, `wrappedKey`/`wrappedKeyNonce` are null. Re-encrypts admin master copy via `AsymmetricCrypto.encrypt(folderKey, adminPublicKey)`. Sends PATCH to `/:folderId/move`. Invalidates FOLDERS, FOLDER_TREE, BREADCRUMBS query keys.

2. **Create `MoveFolderModal` component** (`components/files/MoveFolderModal/index.tsx`): Reuse the `MoveVaultModal` pattern. Uses `useLazyFolderTree` for the tree display. Disables the folder being moved and all its descendants (prevents circular moves). "Root" option moves to workspace root. Calls `useMoveFolder().move()` on confirm.

3. **Update `FolderListItem`**: Add "Move" action to the context menu (after download, before delete). Opens `MoveFolderModal`. Follow the pattern from `VaultListItem`'s move action.

4. **Verify `useLazyFolderTree` and `MoveVaultModal`** still work without changes.

5. **Add i18n keys** for the new modal title and button text.

## Explicitly forbidden in this phase

- Do NOT modify any backend files.
- Do NOT modify crypto utilities (`KeyWrapping`, `KeyChainResolver`, `SymmetricCrypto`, `AsymmetricCrypto`).
- Do NOT modify `useGetFolderKey`, `useDecryptFolder`, `useDecryptVault`.
- Do NOT modify `AddNewEntity`, `UploadContext`, or `DownloadContext`.
- Do NOT add sharing/ACL management UI.
- Do NOT install new npm dependencies.
- Do NOT add folder rename functionality.

## Hard rules

- Arrow functions only -- no `function` keyword.
- Interfaces prefixed with `I`.
- Folder-based file structure: `ComponentName/index.tsx` for components, `hookName/index.ts` for hooks.
- Use `SizeEnum` for all numeric spacing values (XS=5, SM=10, MD=20, LG=30, XL=40).
- Use existing UI wrapper components (`Modal`, `Button`, `Group`, `Stack`, `Text`, etc.) instead of importing directly from Mantine.
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
- `packages/frontend/src/api/hooks/useMoveFolder/index.ts`
- `packages/frontend/src/components/files/MoveFolderModal/index.tsx`

**Modified:**
- `packages/frontend/src/components/files/FolderListItem/index.tsx`
- i18n locale files

Nothing in `packages/backend/` should appear. No crypto utilities should be modified.

## Report

When done, summarize:
1. Exact files created/modified with line counts.
2. Whether `npm run build` succeeded.
3. Whether `tsc --noEmit` passed.
4. Which files you verified needed NO changes (`useLazyFolderTree`, `MoveVaultModal`).
5. Any issues encountered and how they were resolved.
6. Any deviations from the plan (with justification).

Then stop -- the user reviews before the next phase.
