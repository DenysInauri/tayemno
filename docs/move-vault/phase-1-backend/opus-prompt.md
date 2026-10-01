# Phase 1 — Backend: Folder Tree + Move Vault + S3 Key Simplification

You are implementing Phase 1 of the "Move Vault Between Folders" feature in a monorepo. Working from the repo root: `/Users/inaurifam/Desktop/tayemno`.

## Read first, in this exact order

1. `docs/move-vault/phase-1-backend/plan.md` — the step-by-step plan you must follow exactly
2. `docs/move-vault/README.md` — decisions, verified findings, and scope boundaries
3. `.claude/CLAUDE.md` — project conventions (especially: arrow functions, never include `Co-Authored-By`)
4. `.claude/backend/architecture.md` — three-layer architecture, code style rules

Then read these existing sibling files whose patterns you must imitate:

5. `packages/backend/src/routes/vaults/deleteVault/index.ts` — route pattern (Fastify generics, try/catch, error shape)
6. `packages/backend/src/services/vaults/deleteVault/index.ts` — service pattern (auth check by folderId vs workspace, repo calls)
7. `packages/backend/src/services/vaults/createVault/index.ts` — service pattern (mapVault helper)
8. `packages/backend/src/repositories/vaults/index.ts` — repository pattern (drizzle queries, imports)
9. `packages/backend/src/repositories/folders/index.ts` — repository pattern (JOINs with folder_members, natural sort order)
10. `packages/backend/src/services/folders/getFolders/index.ts` — service pattern for folders (workspace membership check)
11. `packages/backend/src/routes/folders/getFolders/index.ts` — route pattern for folders
12. `packages/backend/src/services/vaults/presignVault/index.ts` — the S3 key line you'll change
13. `packages/shared/src/index.ts` — where to add shared types (add after last interface)

## The task

Follow `docs/move-vault/phase-1-backend/plan.md` exactly, steps 1 through 12. Each step specifies the exact file, the before/after code, and where to place it.

Summary of what you're building:
- **Step 1:** Add `IMoveVaultRequest`, `IMoveVaultResponse`, `IFolderTreeNode`, `IGetFolderTreeResponse` to shared types
- **Steps 2-3:** Add `updateMove` to vaults repo, `findAllByUser` to folders repo
- **Steps 4-7:** `getFolderTree` service + route + barrel registrations
- **Steps 8-11:** `moveVault` service + route + barrel registrations
- **Step 12:** Simplify S3 key format (remove `folderSegment`)

## Explicitly forbidden in this phase

- Any frontend changes (Phase 2)
- Any i18n, component, or hook files
- Adding tests (not in scope)
- Adding request validation schemas (Fastify/Zod) — the codebase doesn't use them on other routes
- Modifying the database schema or creating migrations
- Modifying any auth middleware
- Adding any new npm dependencies
- S3 object relocation logic — we are NOT moving S3 objects, only changing the key format for new uploads

## Hard rules

- Follow the three-layer architecture: routes call services, services call repositories. No DB queries in routes or services.
- Match the exact code style of sibling files (arrow function exports, `HttpError` for errors, `mapVault` pattern for date conversion).
- Do not add comments beyond what sibling files have.
- Do not add type annotations beyond what sibling files have.
- Do not commit or push.
- Do not run destructive commands.
- Never include `Co-Authored-By` in commit messages.

## Verify

After completing all steps, run:

```bash
npm run build -w packages/shared
npm run build -w packages/backend
```

Then check your diff scope:

```bash
git diff --name-only
```

Expected files in the diff (and nothing else):

```
packages/shared/src/index.ts
packages/backend/src/repositories/vaults/index.ts
packages/backend/src/repositories/folders/index.ts
packages/backend/src/services/folders/getFolderTree/index.ts  (new)
packages/backend/src/services/folders/index.ts
packages/backend/src/routes/folders/getFolderTree/index.ts    (new)
packages/backend/src/routes/folders/index.ts
packages/backend/src/services/vaults/moveVault/index.ts       (new)
packages/backend/src/services/vaults/index.ts
packages/backend/src/routes/vaults/moveVault/index.ts         (new)
packages/backend/src/routes/vaults/index.ts
packages/backend/src/services/vaults/presignVault/index.ts
```

If any file outside this list appears in the diff, undo it.

## Report

When done, summarize:
1. Which steps completed successfully
2. Build output (pass/fail)
3. The `git diff --name-only` output
4. Any issues encountered

Then stop — the user reviews before the next phase.
