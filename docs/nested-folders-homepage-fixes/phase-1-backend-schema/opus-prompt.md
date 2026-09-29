# Phase 1 — Backend: Schema + Nested Folders + Root Vaults

You are executing **Phase 1** of the **Nested Folders + HomePage Fixes** initiative for the Tayemno monorepo. The repo root is at the current working directory. This phase adds a `parentFolderId` column to the folders table, teaches the backend to filter folders by parent, adds a root-level vault query, and updates shared types. No frontend changes in this phase.

## Read first — in this exact order

1. `docs/nested-folders-homepage-fixes/phase-1-backend-schema/plan.md` — the detailed plan you will follow.
2. `docs/nested-folders-homepage-fixes/README.md` — initiative overview, decisions, verified findings.
3. `.claude/backend/architecture.md` — three-layer architecture, routes/services/repositories, code style.
4. `.claude/encryption-key-hierarchy.md` — key hierarchy (for context, not modified in this phase).
5. These existing files whose patterns you must imitate:
   - `packages/backend/src/db/schema.ts` — Drizzle table definitions, column patterns.
   - `packages/backend/src/repositories/folders/index.ts` — existing folder repo with `findByWorkspaceIdAndUserId`.
   - `packages/backend/src/repositories/vaults/index.ts` — existing vault repo with `findByFolderId`.
   - `packages/backend/src/services/folders/getFolders/index.ts` — getFolders service.
   - `packages/backend/src/services/folders/createFolder/index.ts` — createFolder service (membership check pattern).
   - `packages/backend/src/services/vaults/getVaults/index.ts` — getVaults service.
   - `packages/backend/src/routes/folders/getFolders/index.ts` — getFolders route handler.
   - `packages/backend/src/routes/vaults/getVaults/index.ts` — getVaults route handler.
   - `packages/shared/src/index.ts` — shared types.

## The task

Follow the plan in `docs/nested-folders-homepage-fixes/phase-1-backend-schema/plan.md` exactly. The steps are numbered 1–10. Execute them in order:

1. Add `parentFolderId` to shared types: `Folder`, `NewFolder`, `ICreateFolderRequest`, new `IGetFoldersRequest`, update `IGetVaultsRequest`.
2. Add `parentFolderId` column to `folders` table in schema. Generate and apply migration.
3. Update folders repo — add `parentFolderId` parameter and filter to `findByWorkspaceIdAndUserId`. Add `parentFolderId` to the select clause.
4. Update getFolders service — pass `parentFolderId` through to repository.
5. Update getFolders route — read `parentFolderId` from query string, pass to service.
6. Update createFolder service — validate parent folder membership when `parentFolderId` is present, pass to insert.
7. Add `findByWorkspaceIdRootLevel` to vaults repository.
8. Update getVaults service — handle missing `folderId` by checking `workspaceId` and querying root-level vaults.
9. Update getVaults route — pass both `folderId` and `workspaceId` to service.
10. Generate migration, verify TypeScript builds.

### Critical implementation details

- **`parentFolderId` self-reference:** Drizzle may not support inline `.references(() => folders.id)` on a self-referencing column. If it errors, use a bare `uuid("parent_folder_id")` column without the inline reference. The FK can be added via raw SQL in the migration if needed.
- **Filter logic:** `parentFolderId` parameter `undefined` or `null` → `IS NULL` (root folders). Non-null string → `eq` match (children of that folder).
- **Natural sort:** The vaults repo uses a natural sort pattern. Extract it to a `naturalSort` constant to reuse in both `findByFolderId` and `findByWorkspaceIdRootLevel`.
- **getVaults branching:** When `folderId` is present, check folder membership. When absent but `workspaceId` present, check workspace membership and query root-level vaults. When neither, return 400.

## Explicitly forbidden in this phase

- **No frontend changes.** Do not touch anything in `packages/frontend/`.
- **No changes to encryption logic.** The key hierarchy stays exactly as-is.
- **No changes to `encryption-key-hierarchy.md`.** Out of scope.
- **No new endpoints** beyond modifying existing `GET /folders` and `GET /vaults`.
- **No folder membership management** (adding/removing users from folders). Out of scope.
- **No `GET /folders/:id` single-folder endpoint.** Out of scope.

## Hard rules

- **Arrow functions only** — no `function` keyword.
- **Interface naming** — prefix with `I` for interfaces.
- **Import schema with `.js` extension** — `import { folders } from "../../db/schema.js"`.
- **Import folder modules without extension** — `import { findByWorkspaceIdAndUserId } from "../../../repositories/folders"`.
- **`HttpError` for errors** — `throw new HttpError(statusCode, message)`.
- **Do not commit or push.** Leave changes for review.
- **Do not run destructive git commands.**
- **Do not modify `.claude/` directory** contents.

## Verify

After completing all steps, run:

```bash
# 1. Generate migration
cd packages/backend && npx drizzle-kit generate

# 2. Push schema to dev DB
cd packages/backend && npx drizzle-kit push

# 3. TypeScript build — backend must compile
cd packages/backend && npx tsc --build

# 4. TypeScript build — shared must compile
cd packages/shared && npx tsc --build

# 5. Scope check
git diff --name-only
```

Expected files in the diff:

- `packages/shared/src/index.ts`
- `packages/backend/src/db/schema.ts`
- `packages/backend/src/repositories/folders/index.ts`
- `packages/backend/src/repositories/vaults/index.ts`
- `packages/backend/src/services/folders/getFolders/index.ts`
- `packages/backend/src/services/folders/createFolder/index.ts`
- `packages/backend/src/services/vaults/getVaults/index.ts`
- `packages/backend/src/routes/folders/getFolders/index.ts`
- `packages/backend/src/routes/vaults/getVaults/index.ts`
- Migration file(s) under `packages/backend/src/db/` or `packages/backend/drizzle/`

If anything outside this list appears (especially in `packages/frontend/`), investigate and undo unintended changes.

## Report

When done, summarize:

1. Which steps completed successfully.
2. The `tsc --build` output for both backend and shared (confirm zero errors).
3. The `git diff --name-only` output.
4. Whether the self-referencing FK worked inline or required a workaround.
5. Any issues encountered and how you resolved them.

Then stop — the user reviews before the next phase.
