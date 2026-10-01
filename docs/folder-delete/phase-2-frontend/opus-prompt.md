# Phase 2 — Frontend: Delete Folder UI

You are implementing Phase 2 of the "Delete Folder" feature for the Tayemno monorepo. You are working from the repo root at `/Users/inaurifam/Desktop/tayemno`.

This phase adds the frontend UI for deleting folders: a confirmation modal requiring the user to type "delete", a `useDeleteFolder` hook, and an updated `FolderListItem` with a delete action in its context menu.

---

## Step 0 — Verify prerequisites from Phase 1

Phase 1 must be merged before this phase. Verify these files exist and contain the expected content:

1. `packages/shared/src/index.ts` — must contain `export interface IDeleteFolderResponse { message: string; }`
2. `packages/backend/src/services/folders/deleteFolder/index.ts` — must exist (the delete service)
3. `packages/backend/src/routes/folders/deleteFolder/index.ts` — must exist (the DELETE route)

If any of these are missing, **STOP and report** — do not improvise backend code.

---

## Read first, in this exact order

1. **This phase's plan:** `docs/folder-delete/phase-2-frontend/plan.md` — contains every step with exact file paths and before/after code.
2. **Frontend code style doc:** `.claude/frontend/code-style.md` — arrow functions, interface naming, form patterns, validation schemas, i18n key structure.
3. **Frontend UI guide:** `.claude/frontend/ui-guide.md` — wrapper component patterns, SizeEnum usage.
4. **Frontend API guide:** `.claude/frontend/api-guide.md` — two-layer hook pattern, QueryKeyEnum, EndpointEnum, naming conventions.
5. **Existing sibling patterns to imitate:**
   - `packages/frontend/src/api/hooks/useDeleteVault/index.ts` — the hook pattern for `useDeleteFolder`.
   - `packages/frontend/src/components/files/VaultListItem/index.tsx` — the Menu + actions pattern for FolderListItem.
   - `packages/frontend/src/components/files/CreateFolderModal/index.tsx` — the Formik + Modal pattern for DeleteFolderModal.
   - `packages/frontend/src/validations/createFolderSchema/index.ts` — the Yup schema pattern.
   - `packages/frontend/src/components/files/FolderListItem/index.tsx` — the current file to be modified.
6. **i18n file:** `packages/frontend/src/i18n/locales/en.json` — see where to add new keys.
7. **Auth context:** `packages/frontend/src/contexts/AuthContext/index.tsx` — verify `useAuth()` provides `workspace` (needed for URL construction in the hook).
8. **Existing hooks for URL construction:** `packages/frontend/src/api/hooks/useGetFolders/index.ts` — verify how folder endpoint URLs are constructed (uses `EndpointEnum.WORKSPACES + workspace.id + /folders`).

---

## The task

Follow the plan exactly, steps 1 through 5:

1. Create `packages/frontend/src/validations/deleteFolderConfirmSchema/index.ts` — Yup schema that validates the `confirm` field equals "delete".
2. Add i18n keys in `packages/frontend/src/i18n/locales/en.json` — add a `deleteFolder` section inside `files` with title, description, confirmInstruction, field placeholder, submit/cancel labels, and validation messages.
3. Create `packages/frontend/src/api/hooks/useDeleteFolder/index.ts` — DELETE mutation hook following the `useDeleteVault` pattern but with workspace-scoped URL (`${EndpointEnum.WORKSPACES}/${workspace.id}/folders/${folderId}`). Invalidates `FOLDERS` and `FOLDER_SIZE` query keys.
4. Create `packages/frontend/src/components/files/DeleteFolderModal/index.tsx` — confirmation modal with Formik form, text input for typing "delete", Cancel button (default/white variant), Delete button (red, disabled until input matches "delete", shows loading state).
5. Update `packages/frontend/src/components/files/FolderListItem/index.tsx` — add a Menu with a delete action (same pattern as VaultListItem), manage modal open/close state with `useDisclosure`, render `DeleteFolderModal`.

**Decision to make during execution:** The plan's `description` i18n key interpolates `{{ folderName }}` and ideally the folder name should be displayed in **bold** (matching the reference screenshot). Check if the project uses the `Trans` component from `react-i18next` anywhere. If yes, use it. If no, the simplest approach is to split the description into two `t()` calls or use plain interpolation without bold — do not introduce `dangerouslySetInnerHTML`. The key thing is that the folder name is visible in the message.

---

## Explicitly forbidden in this phase

- Do NOT touch any backend files (`packages/backend/`).
- Do NOT touch `packages/shared/` — the type was added in Phase 1.
- Do NOT modify `EndpointEnum` — folder hooks construct URLs inline using `WORKSPACES` (this is the established pattern).
- Do NOT add mobile-specific styles or breakpoints (the app is desktop-only).
- Do NOT refactor VaultListItem or add confirmation to vault delete.
- Do NOT add error handling with `getApiErrorMessage` for the delete mutation unless VaultListItem already does this (it doesn't — it has no onError handler).
- Do NOT add toast/notification on success unless VaultListItem already does this (it doesn't).

---

## Hard rules

- **Arrow functions only** — no `function` keyword.
- **Interface names** prefixed with `I`.
- **Folder-based file structure** — every new module is `ComponentName/index.tsx` or `hookName/index.ts`.
- **Import conventions** — external libraries first, then internal UI components, then enums/utilities. Separate groups with a blank line.
- **Yup schemas** use i18n key strings as error messages, never call `t()` inside the schema.
- **Formik errors** are translated at display time: `t(formik.errors.fieldName)`.
- **Use wrapper components** — import `Button`, `Modal`, `TextInput`, `Text`, `Stack`, `Group` from `../../ui/`, not directly from `@mantine/core`.
- **SizeEnum** for numeric spacing values — but only if needed; string-based Mantine size tokens are fine for component-level sizing.
- Do NOT commit or push.
- Do NOT run destructive commands.
- Do NOT modify `CLAUDE.md` or any files under `.claude/`.

---

## Verify

After completing all steps, run:

```bash
# Build frontend (must succeed — catches type errors and import issues)
npm run build -w packages/frontend
```

Then check your git diff scope:

```bash
git diff --name-only
```

**Expected files in the diff (and nothing else beyond Phase 1's files):**

- `packages/frontend/src/validations/deleteFolderConfirmSchema/index.ts` (new)
- `packages/frontend/src/i18n/locales/en.json`
- `packages/frontend/src/api/hooks/useDeleteFolder/index.ts` (new)
- `packages/frontend/src/components/files/DeleteFolderModal/index.tsx` (new)
- `packages/frontend/src/components/files/FolderListItem/index.tsx`

If any file outside this list appears in the diff (excluding Phase 1 files), undo those changes.

---

## Report

When done, summarize:
1. Which steps completed successfully
2. Build output (pass/fail)
3. The full `git diff --stat` output
4. The decision made about rendering the bold folder name in the description
5. Any issues encountered

Then stop — the user reviews before the next phase.
