# Phase 1 — Backend: S3 Key Restructure + Delete Folder Endpoint

You are implementing Phase 1 of the "Delete Folder" feature for the Tayemno monorepo. You are working from the repo root at `/Users/inaurifam/Desktop/tayemno`.

This phase restructures the S3 key format in the vault presign service and adds a backend endpoint to delete a folder and all its descendants (subfolders, vaults in S3, and DB records).

---

## Read first, in this exact order

1. **This phase's plan:** `docs/folder-delete/phase-1-backend/plan.md` — contains every step with exact file paths and before/after code.
2. **Backend architecture doc:** `.claude/backend/architecture.md` — three-layer architecture, arrow functions only, folder-based file structure, import conventions.
3. **Existing sibling patterns to imitate:**
   - `packages/backend/src/services/vaults/deleteVault/index.ts` — the service pattern (S3 delete + DB delete, permission check, HttpError usage).
   - `packages/backend/src/routes/vaults/deleteVault/index.ts` — the route pattern (Fastify generic typing, try/catch, service call).
   - `packages/backend/src/repositories/folders/index.ts` — the recursive CTE pattern in `findDescendantSizes` (lines 58-76).
   - `packages/backend/src/services/vaults/presignVault/index.ts` — current S3 key generation (line 39).
4. **DB schema:** `packages/backend/src/db/schema.ts` — verify the `folders` table `parentFolderId` has no FK, and `vaults.folderId` / `folderMembers.folderId` have `ON DELETE CASCADE`.
5. **Shared types:** `packages/shared/src/index.ts` — find where `IDeleteVaultResponse` is defined (should be near the end of the file).

---

## The task

Follow the plan exactly, steps 1 through 8:

1. Add `IDeleteFolderResponse` interface to `packages/shared/src/index.ts` (after `IDeleteVaultResponse`).
2. Change the S3 key format in `presignVault/index.ts` line 39 to `{workspaceId}/{folderId|root}/{uuid}/{fileName}`.
3. Add three repository functions (`findDescendantVaultS3Keys`, `findDescendantIds`, `deleteByIds`) to `packages/backend/src/repositories/folders/index.ts`. Add `inArray` to the drizzle-orm import.
4. Create `packages/backend/src/services/folders/deleteFolder/index.ts` — the delete service with S3 batch cleanup and recursive folder deletion.
5. Export `deleteFolder` from `packages/backend/src/services/folders/index.ts`.
6. Create `packages/backend/src/routes/folders/deleteFolder/index.ts` — the DELETE route handler.
7. Register `deleteFolderRoute` in `packages/backend/src/routes/folders/index.ts`.
8. Verify CORS config in `packages/backend/src/index.ts` already allows the DELETE method (it should from the vault delete feature). If not, add it.

---

## Explicitly forbidden in this phase

- Do NOT touch any frontend files (`packages/frontend/`).
- Do NOT create or modify any database migrations. The S3 key change does not affect the DB schema.
- Do NOT add a FK constraint on `parent_folder_id` — that is out of scope.
- Do NOT add confirmation logic, soft delete, undo, or trash functionality.
- Do NOT refactor existing code beyond what the plan specifies (e.g., do not refactor `deleteVault` to share code with `deleteFolder`).

---

## Hard rules

- **Arrow functions only** — no `function` keyword.
- **Interface names** prefixed with `I`.
- **Folder-based file structure** — every new module is `ModuleName/index.ts`.
- **Import conventions** — external libraries first, then `@tayemno/shared`, then internal modules. Use `.js` extension for single-file imports (e.g., `schema.js`), no extension for folder imports.
- **HttpError** for all error throwing — `import { HttpError } from "../../../utils/httpError"`.
- **Shared types** — request/response interfaces live in `@tayemno/shared`, not duplicated locally.
- Do NOT commit or push.
- Do NOT run destructive commands (`git reset --hard`, `git clean`, etc.).
- Do NOT modify `CLAUDE.md` or any files under `.claude/`.

---

## Verify

After completing all steps, run:

```bash
# Build shared package (must succeed since we added a type)
npm run build -w packages/shared

# Build backend (must succeed with new files)
npm run build -w packages/backend
```

Then check your git diff scope:

```bash
git diff --name-only
```

**Expected files in the diff (and nothing else):**

- `packages/shared/src/index.ts`
- `packages/backend/src/services/vaults/presignVault/index.ts`
- `packages/backend/src/repositories/folders/index.ts`
- `packages/backend/src/services/folders/deleteFolder/index.ts` (new)
- `packages/backend/src/services/folders/index.ts`
- `packages/backend/src/routes/folders/deleteFolder/index.ts` (new)
- `packages/backend/src/routes/folders/index.ts`

If any file outside this list appears in the diff, undo those changes.

---

## Report

When done, summarize:
1. Which steps completed successfully
2. Build output (pass/fail)
3. The full `git diff --stat` output
4. Any issues encountered

Then stop — the user reviews before the next phase.
