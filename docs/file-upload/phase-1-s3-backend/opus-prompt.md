# Phase 1 — S3 + Backend Vault Endpoints

You are executing **Phase 1** of the **File Upload** initiative for the Tayemno monorepo. The repo root is at the current working directory. This phase adds S3 infrastructure and two backend vault endpoints (`POST /vaults/presign`, `POST /vaults`). No frontend changes.

## Step 0 — Verify prerequisites

This phase has no prerequisites from earlier phases. However, verify:

1. `packages/backend/src/db/schema.ts` contains the `vaults` table (around line 117) with `encryptedName` column still present.
2. `packages/shared/src/index.ts` contains `Vault` interface with `encryptedName` field.
3. `packages/backend/src/config.ts` does NOT have any S3-related variables.
4. `packages/backend/package.json` does NOT have `@aws-sdk/client-s3` or `@aws-sdk/s3-request-presigner`.

If any of these are wrong, STOP and report what you found.

## Read first — in this exact order

1. `docs/file-upload/phase-1-s3-backend/plan.md` — the detailed plan you will follow.
2. `docs/file-upload/README.md` — initiative overview, decisions, verified findings.
3. `.claude/backend/architecture.md` — three-layer architecture, code style, import conventions.
4. These existing sibling files whose patterns you must imitate:
   - `packages/backend/src/utils/httpError/index.ts` — utility module pattern (for S3 client utility).
   - `packages/backend/src/repositories/folders/index.ts` — repository pattern (for vault repository).
   - `packages/backend/src/services/folders/createFolder/index.ts` — service pattern (for presignVault + createVault).
   - `packages/backend/src/routes/folders/index.ts` — route composition pattern (for vaults routes).
   - `packages/backend/src/routes/folders/createFolder/index.ts` — single route handler pattern.
   - `packages/backend/src/repositories/folderKeyShares/index.ts` — for re-adding `findByFolderIdAndUserId`.
   - `packages/backend/src/index.ts` — app bootstrap, FastifyInstance augmentation.
   - `packages/backend/src/config.ts` — env config schema.

## The task

Follow the plan in `docs/file-upload/phase-1-s3-backend/plan.md` exactly. The steps are numbered 1–14. Execute them in order:

1. Remove `encryptedName` from `schema.ts` and from shared types (`Vault`, `NewVault`).
2. Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` in `packages/backend`.
3. Add R2 environment variables to `config.ts` (schema properties, required array, Config type).
4. Add placeholder S3 vars to root `.env`.
5. Create `packages/backend/src/utils/s3/index.ts` — S3 client factory + `S3` type export.
6. Register S3 client on FastifyInstance in `packages/backend/src/index.ts` (augment declaration, add `app.decorate`).
7. Add shared request/response interfaces to `packages/shared/src/index.ts`: `IPresignVaultRequest`, `IPresignVaultResponse`, `ICreateVaultRequest`, `ICreateVaultResponse`.
8. Create `packages/backend/src/repositories/vaults/index.ts` — `create` function.
9. Create `packages/backend/src/services/vaults/presignVault/index.ts` — access check via folderKeyShares, generate s3Key, create presigned PUT URL.
10. Create `packages/backend/src/services/vaults/createVault/index.ts` — access check, insert via repository, Date→string mapping.
11. Create `packages/backend/src/services/vaults/index.ts` — re-export both services.
12. Re-add `findByFolderIdAndUserId` to `packages/backend/src/repositories/folderKeyShares/index.ts` (add `and` to drizzle-orm import).
13. Create route handlers: `routes/vaults/presignVault/index.ts`, `routes/vaults/createVault/index.ts`, `routes/vaults/index.ts`.
14. Register vault routes in `packages/backend/src/index.ts` with prefix `/vaults`.

## Explicitly forbidden in this phase

- **No frontend changes.** Do not touch anything in `packages/frontend/`.
- **No StreamCrypto class.** That is Phase 2.
- **No upload validation, file type checks, or streaming logic.** The plan says not to.
- **No file download/decryption endpoints.**
- **No vaultKeyShares operations** — only the `vaults` table is used in this phase.
- **Do not add multipart upload logic.**
- **Do not create bucket lifecycle rules or orphan cleanup.**
- **Do not modify any existing route files** (users, auth, security, folders) — only add new vault routes and edit shared files as specified.

## Hard rules

- **Arrow functions only** — no `function` keyword.
- **Interface naming** — prefix with `I` for interfaces, no prefix for type aliases.
- **Import conventions** — external libs first, then `@tayemno/shared`, then internal. Folder modules import without `/index.js`; single files import with `.js` extension.
- **Schema imports** — always `from "../../db/schema.js"` (with `.js`).
- **HttpError** — use `HttpError` class from `utils/httpError`, not plain throws.
- **`db: Database` parameter** — always first param in services and repositories.
- **Do not commit or push.** Leave changes staged for review.
- **Do not run destructive git commands** (`reset --hard`, `checkout .`, etc.).
- **Do not modify `.claude/` directory** contents.

## Verify

After completing all steps, run:

```bash
# 1. TypeScript build — must produce no errors
npx tsc --build --force

# 2. Sync dev DB schema (removes encryptedName column, etc.)
cd packages/backend && npx drizzle-kit push

# 3. Scope check — only these files/folders should appear in git diff
git diff --name-only
```

Expected files in the diff:

- `packages/backend/src/db/schema.ts` (encryptedName removed)
- `packages/backend/src/config.ts` (S3 vars added)
- `packages/backend/src/index.ts` (S3 client + vault routes registered)
- `packages/backend/src/utils/s3/index.ts` (new)
- `packages/backend/src/repositories/vaults/index.ts` (new)
- `packages/backend/src/repositories/folderKeyShares/index.ts` (findByFolderIdAndUserId added)
- `packages/backend/src/services/vaults/index.ts` (new)
- `packages/backend/src/services/vaults/presignVault/index.ts` (new)
- `packages/backend/src/services/vaults/createVault/index.ts` (new)
- `packages/backend/src/routes/vaults/index.ts` (new)
- `packages/backend/src/routes/vaults/presignVault/index.ts` (new)
- `packages/backend/src/routes/vaults/createVault/index.ts` (new)
- `packages/shared/src/index.ts` (encryptedName removed, new interfaces added)
- `packages/backend/package.json` (S3 SDK deps)
- `package-lock.json` (S3 SDK deps)
- `.env` (S3 placeholder vars)

If anything outside this list appears, investigate and undo unintended changes.

## Report

When done, summarize:

1. Which steps completed successfully.
2. The `tsc --build` output (confirm zero errors).
3. The `drizzle-kit push` output (confirm schema synced).
4. The `git diff --name-only` output.
5. Any issues encountered and how you resolved them.

Then stop — the user reviews before the next phase.
