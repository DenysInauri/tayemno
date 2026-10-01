# Phase 2 — Frontend: Move Vault UI

You are implementing Phase 2 of the "Move Vault Between Folders" feature in a monorepo. Working from the repo root: `/Users/inaurifam/Desktop/tayemno`.

## Step 0 — Verify prerequisites

Phase 1 must be merged. Check that these files exist and contain the expected content:

1. `packages/shared/src/index.ts` — must export `IMoveVaultRequest`, `IMoveVaultResponse`, `IFolderTreeNode`, `IGetFolderTreeResponse`
2. `packages/backend/src/routes/vaults/moveVault/index.ts` — must exist (PATCH `/:vaultId/move`)
3. `packages/backend/src/routes/folders/getFolderTree/index.ts` — must exist (GET `/tree`)

If any of these are missing, **STOP and report** — do not improvise the backend.

## Read first, in this exact order

1. `docs/move-vault/phase-2-frontend/plan.md` — the step-by-step plan you must follow exactly
2. `docs/move-vault/README.md` — decisions, verified findings, and scope boundaries
3. `.claude/CLAUDE.md` — project conventions
4. `.claude/frontend/code-style.md` — arrow functions, interface naming, form patterns
5. `.claude/frontend/ui-guide.md` — wrapper component patterns, SizeEnum usage
6. `.claude/frontend/api-guide.md` — two-layer hook pattern, QueryKeyEnum, EndpointEnum

Then read these existing files whose patterns you must imitate:

7. `packages/frontend/src/components/files/DeleteFolderModal/index.tsx` — modal pattern (IProps, Formik optional here, Modal + Stack + Group layout, button placement)
8. `packages/frontend/src/components/files/FolderListItem/index.tsx` — how `useDisclosure` controls modal open/close in a list item
9. `packages/frontend/src/components/files/VaultListItem/index.tsx` — the file you'll modify (current actions, imports, loading state)
10. `packages/frontend/src/api/hooks/useDownloadVault/index.ts` — `decryptVaultKey` pattern (lines 17-47)
11. `packages/frontend/src/api/hooks/useUploadVault/index.ts` — `buildVaultEncryptionKey` pattern (lines 17-52)
12. `packages/frontend/src/api/hooks/useGetFolders/index.ts` — query hook pattern (useApiGet, QueryKeyEnum, endpoint URL construction)
13. `packages/frontend/src/api/hooks/useDeleteVault/index.ts` — mutation hook pattern (invalidateQueries)
14. `packages/frontend/src/services/folderKeyService/index.ts` — `getFolderKey` usage
15. `packages/frontend/src/i18n/locales/en.json` — i18n key naming conventions
16. `packages/frontend/src/enums/api/EndpointEnum/index.ts` — current enum values
17. `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` — current enum values

## The task

Follow `docs/move-vault/phase-2-frontend/plan.md` exactly, steps 1 through 6. Each step specifies the exact file, code shape, and placement.

Summary of what you're building:
- **Step 1:** Add `FOLDER_TREE` to `QueryKeyEnum` (and optionally to `EndpointEnum` — check sibling hooks first to see which URL pattern they use)
- **Step 2:** Create `useGetFolderTree` hook — query that fetches folder tree, controlled by `enabled` param
- **Step 3:** Create `useMoveVault` hook — decrypt vault key from source, re-encrypt for destination, PATCH to backend, invalidate queries
- **Step 4:** Add i18n keys to `en.json` under `files.moveVault.*` and `files.actions.move`
- **Step 5:** Create `MoveVaultModal` component — Modal with TreeSelect, warning text, Cancel/Move buttons. Current folder is disabled in tree. "Files" root node for workspace root.
- **Step 6:** Update `VaultListItem` — add "Move" menu item, wire hooks, render `MoveVaultModal`, extend loading state

## Explicitly forbidden in this phase

- Any backend changes (routes, services, repositories, schema)
- Any changes to shared types (`packages/shared/src/index.ts`)
- Adding new npm dependencies (Mantine TreeSelect is already in `@mantine/core`)
- Adding validation schemas (no Yup schema needed for this modal — there's no text input)
- Creating utility/helper files outside the component and hook files listed
- Adding mobile-specific styles
- Modifying any component not listed in the plan
- Adding tests

## Hard rules

- Use arrow function exports for all components and hooks (project convention).
- Use the project's UI wrapper components (`Modal`, `Button`, `Stack`, `Group`, `Text` from `../../ui/`) — not raw Mantine imports — except for `TreeSelect` which has no wrapper.
- Import `TreeSelect` directly from `@mantine/core`.
- Follow the i18n key naming pattern: `files.moveVault.{key}`.
- Do not add docstrings or comments beyond what sibling files have.
- Do not commit or push.
- Do not run destructive commands.
- Never include `Co-Authored-By` in commit messages.

## Verify

After completing all steps, run:

```bash
npm run build -w packages/frontend
```

Then check your diff scope:

```bash
git diff --name-only
```

Expected files in the diff (and nothing else):

```
packages/frontend/src/enums/api/QueryKeyEnum/index.ts
packages/frontend/src/enums/api/EndpointEnum/index.ts          (only if you added a new value)
packages/frontend/src/api/hooks/useGetFolderTree/index.ts       (new)
packages/frontend/src/api/hooks/useMoveVault/index.ts           (new)
packages/frontend/src/i18n/locales/en.json
packages/frontend/src/components/files/MoveVaultModal/index.tsx (new)
packages/frontend/src/components/files/VaultListItem/index.tsx
```

If any file outside this list appears in the diff, undo it.

## Report

When done, summarize:
1. Which steps completed successfully
2. Build output (pass/fail)
3. The `git diff --name-only` output
4. Any UX decisions you made (especially regarding the loading/open behavior noted in plan step 6)
5. Any issues encountered

Then stop — the user reviews before the next phase.
