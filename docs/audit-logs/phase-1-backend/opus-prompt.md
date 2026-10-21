# Phase 1 — Backend: Encrypted Audit Log Store

You are implementing Phase 1 of the Audit Logs initiative for the Tayemno monorepo. This phase adds a backend encrypted storage layer for audit logs — a new DB table, repository, services, and routes. The backend is a dumb encrypted store: it receives opaque encrypted blobs from the frontend and returns them. It never parses or validates payload content.

Working directory: `/Users/inaurifam/Desktop/tayemno`

This is Phase 1 of 2. Phase 2 (Frontend) depends on this phase being merged first.

---

## Read first, in this exact order

1. **This phase's plan:** `docs/audit-logs/phase-1-backend/plan.md` — the full step-by-step specification.
2. **Project conventions:** `.claude/CLAUDE.md` — monorepo structure, file size limits, styling rules, git rules.
3. **Backend architecture:** `.claude/backend/architecture.md` — three-layer pattern, code style.
4. **Existing schema** (sibling pattern): `packages/backend/src/db/schema.ts` — study how tables are defined (column types, FK references, timestamps).
5. **Existing route plugin** (sibling pattern): `packages/backend/src/routes/folders/index.ts` — study how route groups register hooks and sub-routes.
6. **Existing route** (sibling pattern): `packages/backend/src/routes/folders/createFolder/index.ts` — study the route → service call pattern.
7. **Existing service** (sibling pattern): `packages/backend/src/services/folders/createFolder/index.ts` — study how services receive `(db, userId, workspaceId, data)`.
8. **Existing repository** (sibling pattern): `packages/backend/src/repositories/folders/index.ts` — study Drizzle ORM usage (both `db.insert()` and `db.execute(sql`...`)` patterns).
9. **Admin authorization hook**: `packages/backend/src/utils/authorizeAdmin/index.ts` — study how it works.
10. **Shared types**: `packages/shared/src/index.ts` — study existing interface patterns.
11. **Main server file**: `packages/backend/src/index.ts` — study how route plugins are registered.

---

## The task

Follow `docs/audit-logs/phase-1-backend/plan.md` exactly, steps 1 through 7.

Summary of what to create/edit:

1. **Edit** `packages/backend/src/db/schema.ts` — append `auditLogs` table after the `vaults` table.
2. **Run** `npm run db:generate` from `packages/backend` to generate the Drizzle migration. Then run `npm run db:migrate` to apply it.
3. **Edit** `packages/shared/src/index.ts` — append audit log types at the end.
4. **Create** `packages/backend/src/repositories/auditLogs/index.ts` — `create`, `findByFolderId`, `findByVaultId` functions.
5. **Create** `packages/backend/src/services/auditLogs/createAuditLog/index.ts` — validates workspace membership, stores log with `request.ip`.
6. **Create** `packages/backend/src/services/auditLogs/getAuditLogs/index.ts` — queries by folderId or vaultId with cursor pagination.
7. **Create** `packages/backend/src/services/auditLogs/index.ts` — barrel re-exports.
8. **Create** `packages/backend/src/routes/auditLogs/createAuditLog/index.ts` — POST route, passes `request.ip` to service.
9. **Create** `packages/backend/src/routes/auditLogs/getAuditLogs/index.ts` — GET route with `authorizeAdmin` per-plugin hook.
10. **Create** `packages/backend/src/routes/auditLogs/index.ts` — route group plugin with `authenticate` + `requirePasswordChanged` hooks.
11. **Edit** `packages/backend/src/index.ts` — import and register `auditLogsRoutes` with prefix `/workspaces/:workspaceId/audit-logs`.

---

## Explicitly forbidden in this phase

- **Do NOT** create or modify any frontend files.
- **Do NOT** modify any existing service files (folders, vaults, members) — audit logs are created by the frontend, not by backend services.
- **Do NOT** add any payload validation, action-type checking, or content parsing on the backend — the backend is a dumb encrypted store.
- **Do NOT** add `actorId` or user-related columns to the audit_logs table — actor identity is inside the encrypted payload.
- **Do NOT** add `updatedAt` to the audit_logs table — audit logs are immutable.
- **Do NOT** add FK references for `folderId` or `vaultId` — audit logs must persist after resource deletion.
- **Do NOT** add any cleanup/TTL logic for audit logs.
- **Do NOT** add WebSocket/real-time features.
- **Do NOT** modify any files listed in the Out of Scope section of `docs/audit-logs/README.md`.

---

## Hard rules

- Follow the project's three-layer architecture: Route → Service → Repository. No exceptions.
- Match existing code style exactly: arrow function exports, `HttpError` for errors, `mapTimestamps`-style date handling, `db.execute(sql`...`)` for complex queries, `db.insert()` for simple inserts.
- All new interfaces use the `I` prefix convention.
- Keep files under 120 lines (150 max).
- Do NOT commit or push. Do NOT run destructive git commands.
- Do NOT add `Co-Authored-By` to any commit messages.
- Do NOT modify git config.

---

## Verify

After completing all steps:

1. Run `npm run build` in `packages/shared` — must succeed.
2. Run `npm run build` in `packages/backend` — must succeed.
3. Run `git diff --stat` — verify only the expected files are changed:
   - `packages/backend/src/db/schema.ts` (edited)
   - `packages/backend/src/index.ts` (edited)
   - `packages/shared/src/index.ts` (edited)
   - `packages/backend/drizzle/<new-migration>/` (new directory)
   - `packages/backend/src/repositories/auditLogs/index.ts` (new)
   - `packages/backend/src/services/auditLogs/createAuditLog/index.ts` (new)
   - `packages/backend/src/services/auditLogs/getAuditLogs/index.ts` (new)
   - `packages/backend/src/services/auditLogs/index.ts` (new)
   - `packages/backend/src/routes/auditLogs/createAuditLog/index.ts` (new)
   - `packages/backend/src/routes/auditLogs/getAuditLogs/index.ts` (new)
   - `packages/backend/src/routes/auditLogs/index.ts` (new)

---

## Report

When done, summarize:
- Which files were created/edited
- Whether builds passed
- Any deviations from the plan (and why)
- The exact migration name generated

Then stop — the user reviews before Phase 2.
