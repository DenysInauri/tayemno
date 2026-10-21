# Audit Logs

Zero-knowledge audit logging for workspace file and folder operations. Every tracked user action creates an encrypted audit log entry visible only to workspace admins and owners in a new "Activity" tab in the aside panel.

The backend is a dumb encrypted store — it receives opaque blobs from the frontend and can only filter by `workspace_id`, `folder_id`, `vault_id`, and `created_at`. Action types, actor names, resource names, and all context live inside an encrypted payload that only admin/owner key holders can decrypt.

## Decisions

1. **Action type format** — String enum (e.g., `"folder.created"`) inside the encrypted payload. Server never sees it. Approved.
2. **Move operation logging** — 2 separate entries per move: one in the source folder (`*.moved_from`), one in the target folder (`*.moved_to`). Approved.
3. **Read operation logging** — Frontend controls when to POST. No server-side logging of GET requests. Approved.
4. **Preview vs download distinction** — Frontend knows which is which, POSTs appropriately. Approved.
5. **User data storage** — Snapshot `actorName` + `actorEmail` inside the encrypted payload. No JOINs. Approved.
6. **Pagination** — Cursor-based on `created_at`, 50 entries per page. Approved.
7. **trustProxy** — Skipped. Use `request.ip` as-is. Approved.
8. **File-level audit logs** — Audit logs are scoped to both folders AND individual files. The `audit_logs` table has both `folder_id` and `vault_id` columns. The aside Activity tab shows file-specific logs when a file is selected, otherwise folder-level logs. Approved.
9. **File-level events** — All file actions are logged: create, delete, move, preview, download. Approved.
10. **IP address** — Captured server-side via `request.ip`, stored in plaintext. Not a zero-knowledge violation since the server already sees it at the network level. Approved.
11. **Click interaction** — Single click on a row selects the item and shows its details in the aside (both Members and Activity tabs follow the selected item). Double click opens the item (navigates into folder / opens file preview). This is a standard file explorer pattern. Approved.
12. **Members tab follows selection** — When a subfolder is single-click selected, the Members tab shows that subfolder's members (not the navigated folder). Both aside tabs follow the selected item. Approved.
13. **Selection via URL search params** — Selected item stored as `?select=folder:<id>` or `?select=vault:<id>` in the URL instead of a React context. Makes links shareable. Uses `replace: true` to avoid polluting browser history on clicks. Approved.

## Verified Findings

These facts were verified by reading the codebase. Each phase prompt instructs the executing session to re-verify before relying on them.

| # | Fact | Source |
|---|------|--------|
| 1 | Three-layer pattern: Route → Service → Repository. Routes extract `app.db`, `request.user.sub`, params. Services take `(db, userId, workspaceId, data)`. | `routes/folders/createFolder/index.ts:5-23`, `services/folders/createFolder/index.ts:12-57` |
| 2 | Drizzle schema in `src/db/schema.ts` (200 lines). Tables use `uuid().defaultRandom().primaryKey()`, `timestamp("created_at", { withTimezone: true }).defaultNow()`. | `db/schema.ts` |
| 3 | Route plugins registered in `src/index.ts:67-78`. Folder routes prefixed `/workspaces/:workspaceId/folders`. | `src/index.ts` |
| 4 | `authorizeAdmin` hook checks `member.role !== "owner" && member.role !== "admin"`, returns 403. Used at route-group or per-plugin level. | `utils/authorizeAdmin/index.ts:4-20`, `routes/members/index.ts:13` |
| 5 | Shared types in `@tayemno/shared/src/index.ts` (496 lines). Interfaces use `I` prefix. | `shared/src/index.ts` |
| 6 | Vaults use hybrid encryption: `encryptedSymmetricKey` per entry + `adminEncryptedSymmetricKey` wrapped with workspace admin public key. | `db/schema.ts:188-190` |
| 7 | Workspace `adminPublicKey` stored in plaintext in `workspaces` table — any member can encrypt for admin. | `db/schema.ts:87` |
| 8 | AsideContent has one tab ("members"), uses Mantine `Tabs`/`TabsList`/`TabsTab`/`TabsPanel` wrappers, conditionally renders by `folderId` from `useParams`. | `components/layout/AppShell/AsideContent/index.tsx:1-42` |
| 8a | Currently single-click on folder navigates into it, single-click on vault opens preview. Both are `onClick` handlers in `VirtualizedFileTable`. Preview triggered via `previewRef.current?.open(vault)`. | `components/files/VirtualizedFileTable/index.tsx`, `components/files/PreviewOverlay/index.tsx` |
| 9 | Aside shown only for admin/owner on files routes. Controlled by `useAppShellLayout`. | `useAppShellLayout/index.ts:13-14,23` |
| 10 | Two-layer API hook pattern: base hooks (`useApiGet`/`useApiPost`/etc.) + feature hooks using `QueryKeyEnum` + `EndpointEnum`. | `api/hooks/useApiGet/index.ts`, `api/hooks/useGetFolderMembers/index.ts` |
| 11 | FolderMembersSection (~107 lines) is the sibling pattern for aside tab content: search + virtualized list + actions. | `AsideContent/FolderMembersSection/index.tsx` |
| 12 | Virtualization uses `@tanstack/react-virtual` with `useVirtualizer`, ROW_HEIGHT, overscan, padding spacers. | `FolderMembersList/index.tsx` |
| 13 | i18n keys follow `aside.<section>.<detail>` pattern. English locale in `i18n/locales/en.json`. | `en.json:123-145` |
| 14 | `QueryKeyEnum` in `enums/api/QueryKeyEnum/index.ts`. `EndpointEnum` in `enums/api/EndpointEnum/index.ts`. | Respective files |
| 15 | CSS modules: co-located `index.module.css`, imported as `classes`, semantic class names. | `AsideContent/index.module.css` |
| 16 | No IP tracking exists in backend. `request.ip` available but unused. Fastify: `{ logger: true }`, no `trustProxy`. | `src/index.ts:35` |
| 17 | Service barrel exports: `services/folders/index.ts` re-exports all folder services. | `services/folders/index.ts` |
| 18 | Migrations via drizzle-kit. Output dir: `./drizzle`. Commands: `npm run db:generate`, `npm run db:migrate`. | `drizzle.config.ts` |
| 19 | `mapTimestamps` converts Date to ISO string on `createdAt`/`updatedAt`. | `utils/mapTimestamps/index.ts:1-18` |
| 20 | File size limit: 120 lines (150 max). Extract into `functionName/index.ts` folders. | `.claude/CLAUDE.md` |
| 21 | `authorizeAdmin` can be added as a per-plugin hook (see `bulkCreateFolderAcl` route registering its own `onRequest` hook inside its plugin). | `routes/folders/bulkCreateFolderAcl/index.ts` pattern |
| 22 | No foreign key references needed for `folder_id` and `vault_id` in audit_logs — folders and vaults can be deleted, but their audit history should persist. `workspace_id` cascades. | Design decision based on audit trail requirements |

## Behavioral Changes

After both phases ship:

- **New DB table**: `audit_logs` with encrypted payload storage, scoped by `folder_id` and `vault_id`.
- **New endpoints**: `POST /workspaces/:workspaceId/audit-logs` (any authenticated member) and `GET /workspaces/:workspaceId/audit-logs` (admin/owner only, cursor-paginated).
- **New aside tab**: "Activity" tab next to "Members" for admin/owner on files routes.
- **Single click / double click interaction**: Single click on any row selects it and shows its details in the aside (both tabs). Double click opens (navigates into folder / opens file preview). This replaces the current single-click-to-open behavior.
- **Both aside tabs follow selection**: Members tab shows selected folder's members (or vault's parent folder members). Activity tab shows selected item's audit logs. When nothing is selected, both tabs fall back to the current navigated folder (from URL).
- **Frontend fires audit log POSTs** after: folder create, folder move, folder open, vault create, vault delete, vault move, vault preview, vault download, folder ACL create.
- **Move operations produce 2 log entries**: one in source folder, one in target folder. Both reference the same vault (for vault moves).

## Tracked Events

| # | Action | `folder_id` | `vault_id` | Encrypted context |
|---|--------|-------------|------------|-------------------|
| 1 | `folder.opened` | target folder | null | `{ folderName }` |
| 2 | `folder.created` | parent folder | null | `{ folderName }` |
| 3 | `vault.created` | parent folder | vault | `{ vaultName }` |
| 4 | `vault.deleted` | parent folder | vault | `{ vaultName }` |
| 5 | `vault.moved_from` | source folder | vault | `{ vaultName, targetFolderName }` |
| 6 | `vault.moved_to` | target folder | vault | `{ vaultName, sourceFolderName }` |
| 7 | `folder.moved_from` | source parent | null | `{ movedFolderName, targetFolderName }` |
| 8 | `folder.moved_to` | target parent | null | `{ movedFolderName, sourceFolderName }` |
| 9 | `vault.previewed` | parent folder | vault | `{ vaultName }` |
| 10 | `vault.downloaded` | parent folder | vault | `{ vaultName }` |
| 11 | `folder_acl.created` | target folder | null | `{ memberName, memberEmail }` |

## Phase Table

| Phase | Name | Plan | Depends on |
|-------|------|------|------------|
| 1 | Backend | [phase-1-backend/plan.md](phase-1-backend/plan.md) | — |
| 2 | Frontend | [phase-2-frontend/plan.md](phase-2-frontend/plan.md) | Phase 1 merged |

## Out of Scope

- Audit log data retention / TTL / cleanup
- Audit log export (CSV, JSON, etc.)
- Real-time updates (WebSocket / SSE)
- Auth event logging (sign in, password change)
- Member management logging beyond folder ACL (invite, delete, reinvite)
- Filtering by action type, actor, or date range in the UI
- Mobile-specific views
- Audit log deletion or editing
