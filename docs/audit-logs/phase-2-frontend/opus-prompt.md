# Phase 2 — Frontend: Audit Log Encryption, Display, and Instrumentation

You are implementing Phase 2 of the Audit Logs initiative for the Tayemno monorepo. This phase adds the frontend layer: crypto helpers for encrypting/decrypting audit log payloads, API hooks, a new "Activity" tab in the aside panel with virtualized rendering and cursor pagination, a single-click/double-click interaction model for the file table, and instrumentation that fires audit log POSTs after every tracked user action.

Working directory: `/Users/inaurifam/Desktop/tayemno`

This is Phase 2 of 2. Phase 1 (Backend) must already be merged.

---

## Step 0 — Verify prerequisites

Phase 1 should have produced these files. **STOP and report if any are missing** — do not improvise replacements.

1. `packages/backend/src/db/schema.ts` — must contain an `auditLogs` table definition at the end.
2. `packages/shared/src/index.ts` — must contain these exports:
   - `AuditAction` type
   - `IAuditLogPayload` interface
   - `ICreateAuditLogRequest` interface
   - `ICreateAuditLogResponse` interface
   - `IAuditLogEntry` interface
   - `IGetAuditLogsResponse` interface
3. `packages/backend/src/routes/auditLogs/index.ts` — must exist (the route plugin).
4. `packages/backend/src/index.ts` — must register `auditLogsRoutes` with prefix `/workspaces/:workspaceId/audit-logs`.

If all four checks pass, proceed.

---

## Read first, in this exact order

1. **This phase's plan:** `docs/audit-logs/phase-2-frontend/plan.md` — the full step-by-step specification.
2. **Initiative README:** `docs/audit-logs/README.md` — decisions, tracked events table, out of scope.
3. **Project conventions:** `.claude/CLAUDE.md` — file size limits (120 lines / 150 max), CSS modules, no inline styles, desktop only.
4. **Frontend code style:** `.claude/frontend/code-style.md` — arrow functions, `I` prefix interfaces, i18n key patterns.
5. **Frontend UI guide:** `.claude/frontend/ui-guide.md` — wrapper components, folder conventions, `SizeEnum`.
6. **Frontend API guide:** `.claude/frontend/api-guide.md` — two-layer hook pattern, QueryKeyEnum, EndpointEnum.
7. **Sibling aside component** (CRITICAL): `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx` — this is the pattern to follow for `AuditLogSection`.
8. **Sibling virtualized list**: `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMembersList/index.tsx` — this is the pattern to follow for `AuditLogList`.
9. **AsideContent**: `packages/frontend/src/components/layout/AppShell/AsideContent/index.tsx` — the file you'll edit to add the Activity tab.
10. **Crypto utilities**: Read these two files to understand the encryption API:
    - `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts`
    - `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts`
11. **Admin key access pattern**: `packages/frontend/src/api/hooks/useGetFolderKeyAsAdmin/index.ts` — study how it decrypts `workspace.encryptedAdminPrivateKey` using the user's keypair. You will replicate this pattern for audit log decryption.
12. **Auth context**: `packages/frontend/src/contexts/AuthContext/index.tsx` — understand what `useAuth()` provides (`user`, `workspace`, keypair access).
13. **File table + preview**: Read these to understand the current click handlers and preview flow:
    - `packages/frontend/src/components/files/VirtualizedFileTable/index.tsx`
    - `packages/frontend/src/components/files/PreviewOverlay/index.tsx`
14. **Enums**: Read both enum files to see current entries:
    - `packages/frontend/src/enums/api/QueryKeyEnum/index.ts`
    - `packages/frontend/src/enums/api/EndpointEnum/index.ts`
15. **i18n locale**: `packages/frontend/src/i18n/locales/en.json` — see existing `"aside"` keys structure.
16. **Mutation call sites** — read each of these to find the exact location for audit log instrumentation:
    - `packages/frontend/src/components/files/AddNewEntity/CreateFolderAction/index.tsx` (folder create)
    - `packages/frontend/src/components/files/FolderListItem/index.tsx` (folder move)
    - `packages/frontend/src/components/files/VaultListItem/index.tsx` (vault move/delete/download)
    - `packages/frontend/src/contexts/UploadContext/useFileUpload/index.ts` (vault create after upload)
    - `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx` (folder ACL create)
    - `packages/frontend/src/pages/HomePage/index.tsx` (folder navigation)

---

## The task

Follow `docs/audit-logs/phase-2-frontend/plan.md` exactly, steps 1 through 12.

Summary:

1. **Edit** `QueryKeyEnum` — add `AUDIT_LOGS`.
2. **Edit** `EndpointEnum` — add `AUDIT_LOGS`.
3. **Create** `utils/crypto/encryptAuditLog/index.ts` — encrypts payload with random symmetric key wrapped by admin public key.
4. **Create** `utils/crypto/decryptAuditLog/index.ts` — decrypts payload using admin private key.
5. **Create** `api/hooks/usePostAuditLog/index.ts` — fire-and-forget mutation hook.
6. **Create** `api/hooks/useGetAuditLogs/index.ts` — `useInfiniteQuery` hook with cursor pagination.
7. **Create** `api/hooks/useDecryptAuditLogs/index.ts` — batch decryption hook following `useGetFolderKeyAsAdmin` key derivation pattern.
8. **Create** `hooks/useSelectedItem/index.ts` — hook using URL search params (`?select=folder:<id>` or `?select=vault:<id>`) for item selection. No React context needed.
9. **Edit** `VirtualizedFileTable` — change single-click to select (calls `useSelectedItem`), double-click to open (navigate folder / open preview). Add visual selected-row state.
10. **Create** `AsideContent/AuditLogSection/` — main section component + virtualized list + per-entry rendering.
11. **Edit** `AsideContent/index.tsx` — add "Activity" tab. Both Members and Activity tabs follow the selected item from `useSelectedItem()`. Fall back to `folderId` from URL params when nothing selected.
12. **Edit** `i18n/locales/en.json` — add all activity-related translations.
13. **Instrument** call sites (steps 12a–12j in the plan) with `logAction()` calls.

---

## Explicitly forbidden in this phase

- **Do NOT** modify any backend files (routes, services, repositories, schema).
- **Do NOT** modify `packages/shared/src/index.ts` — all shared types were added in Phase 1.
- **Do NOT** add filtering by action type, actor, or date range — out of scope.
- **Do NOT** add real-time updates or WebSocket — out of scope.
- **Do NOT** add audit logging for events not in the tracked events table (no folder.deleted, no auth events, no member invite/delete).
- **Do NOT** add mobile-responsive styles.
- **Do NOT** add `Co-Authored-By` to any commit messages.
- **Do NOT** create documentation or README files.

---

## Hard rules

- All new files must be under 120 lines (150 absolute max). If a file grows beyond this, extract into `functionName/index.ts` subfolders.
- Use CSS modules for all styles. No inline `style={{}}` for static values.
- Arrow function components and exports only. No `function` declarations.
- All interfaces use `I` prefix. All props interfaces are `IProps`.
- Use `SizeEnum` for spacing values. Use semantic class names in CSS modules.
- Import from `@tayemno/shared` for shared types.
- Use `QueryKeyEnum` and `EndpointEnum` — never hardcode API strings.
- Use wrapper components (`Text`, `Title`, `Stack`, `Group`, etc.) from `components/ui/` — never import directly from `@mantine/core` in feature components.
- Audit log POSTs must be fire-and-forget — never block user operations or show errors for failed audit logs.
- URL search param changes for selection must use `replace: true` — do NOT pollute browser history with selection clicks.
- Do NOT commit or push. Do NOT run destructive git commands.

---

## Verify

After completing all steps:

1. Run `npm run build` in `packages/frontend` — must succeed with no errors.
2. Run `git diff --stat` — verify only expected files appear:
   - **Edited**: `QueryKeyEnum/index.ts`, `EndpointEnum/index.ts`, `en.json`, `AsideContent/index.tsx`, `VirtualizedFileTable/index.tsx` (and possibly row components), plus ~8-10 component/hook files for instrumentation.
   - **New**: `encryptAuditLog/index.ts`, `decryptAuditLog/index.ts`, `usePostAuditLog/index.ts`, `useGetAuditLogs/index.ts`, `useDecryptAuditLogs/index.ts`, `hooks/useSelectedItem/index.ts`, `AuditLogSection/` directory with components + CSS module.
   - **NOT present**: No backend files, no shared package changes, no context provider files.
3. Verify all new files are under 120 lines: `wc -l` on each new file.

---

## Report

When done, summarize:
- Which files were created/edited (full list)
- Whether the build passed
- Any deviations from the plan (and why)
- Any open questions about crypto key access or component structure that you resolved differently

Then stop — the user reviews before considering this initiative complete.
