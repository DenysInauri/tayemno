# Audit Logs

## Problem Statement

Workspace admins cannot answer "who did what, when, and where?" across their workspace. The current implementation shows audit logs only in the aside panel, scoped to a single folder or file, with no filtering, no workspace-wide view, and no export. This makes it impossible to investigate security incidents, perform compliance audits, or understand workspace activity patterns — all critical needs for a B2B secure workspace product.

## User Roles

| Role | Interaction |
|------|-------------|
| **Admin / Owner** | Full access: view dedicated Audit Logs page, filter, export CSV, see contextual logs in aside panel |
| **Member** | No access to audit logs. Their actions are logged transparently. |
| **External Member** | No access to audit logs. Their actions are logged transparently. |

## Competitor Summary

| Competitor | What they offer | Key takeaway for us |
|------------|----------------|---------------------|
| **Tresorit** | Per-folder activity logs + CSV export (desktop only). Categories: File, Permission, Links, File Requests. 90-day retention after deletion. | Per-folder context is valuable (we have it), but export is essential for compliance. |
| **Proton Business** | 4 separate monitors: Account (auth events), Organization (admin changes), Gateway (VPN), Pass (passwords). Optional IP/device data. Org events stored permanently. | Separating auth events from file events is a clean pattern. Permanent org event storage is the B2B expectation. |
| **Google Workspace** | Security investigation tool with rich filtering (user, file, event, date, visibility). BigQuery export. 6-month history. 100k row CSV limit. | Filtering is the killer feature — admins need to quickly find specific events during investigations. |
| **Dropbox Business** | Admin console Activity tab. Filters: Date, Activities, People, Participants, Content. CSV export + SIEM API. 20+ event categories. | Most complete B2B solution — filters + export + API is the gold standard. |

Sources: [Tresorit Activity Logs](https://support.tresorit.com/hc/en-us/articles/360011757753-Export-activity-logs), [Proton Activity Monitor](https://proton.me/support/business-activity-monitor), [Proton Organization Monitor](https://proton.me/support/organization-monitor), [Google Workspace Audit Logs](https://workspaceupdates.googleblog.com/2026/04/workspace-audit-logs-new-functionality-and-expanded-event-fields-in-the-admin-console.html), [Dropbox Admin Reports](https://help.dropbox.com/account-access/admin-console-reports)

## Tracked Action Types

### Currently implemented (11)

| Action | Description | Context |
|--------|-------------|---------|
| `folder.opened` | User opened a folder | Folder name |
| `folder.created` | New folder created | Folder name |
| `vault.created` | File uploaded | File name, folder name |
| `vault.deleted` | File deleted | File name, folder name |
| `vault.moved_from` | File moved away from folder | File name, source folder |
| `vault.moved_to` | File received into folder | File name, target folder |
| `folder.moved_from` | Folder moved away | Folder name, source parent |
| `folder.moved_to` | Folder received | Folder name, target parent |
| `vault.previewed` | File previewed | File name |
| `vault.downloaded` | File downloaded | File name |
| `folder_acl.created` | Member added to folder | Member name/email, folder name |

### New — member management (3)

| Action | Description | Context |
|--------|-------------|---------|
| `member.invited` | Admin invited a new member to the workspace | Member name/email, assigned role |
| `member.removed` | Admin removed a member from the workspace | Member name/email |
| `member.role_changed` | Admin changed a member's role | Member name/email, old role, new role |

### New — access control (2)

| Action | Description | Context |
|--------|-------------|---------|
| `folder_acl.revoked` | Admin revoked a member's folder access | Member name/email, folder name |
| `folder.renamed` | Folder was renamed | Old name, new name |

### New — authentication (3)

| Action | Description | Context |
|--------|-------------|---------|
| `auth.sign_in` | User signed in successfully | — |
| `auth.sign_out` | User signed out | — |
| `auth.password_changed` | User changed their password | — |

**Total: 19 action types**

### E2EE note on auth events

Auth events (`auth.sign_in`, `auth.sign_out`, `auth.password_changed`) are created by the frontend after the auth flow completes and workspace keys are available. The encrypted payload contains minimal context (actor name/email). The `userId` and `actionType` are stored as plaintext columns for server-side filtering.

## User Flow

### Admin Flow — Dedicated Audit Logs Page

1. Admin sees an **"Audit Logs" icon** in the left navbar (below Users icon). Icon is only visible for admin/owner roles.
2. Clicking the icon navigates to `/audit-logs`.
3. The page shows:
   - **Page title**: "Audit Logs"
   - **Filter bar** (top of page):
     - **Date range**: "From" and "To" date pickers. Default: last 30 days.
     - **Action type**: Dropdown with action categories. Multi-select. Default: all types.
     - **Actor**: Searchable dropdown of workspace members. Default: all members.
     - **Reset filters** link to clear all.
   - **Export button**: "Export CSV" — exports logs matching current filters.
   - **Log table**:
     - Columns: Timestamp | Actor | Action | Details | IP Address
     - Sorted by newest first (descending `createdAt`)
     - Each row shows:
       - Timestamp: formatted date and time
       - Actor: name (email below in smaller text)
       - Action: human-readable label (e.g., "Uploaded file")
       - Details: contextual info — folder name, file name, member name, etc.
       - IP Address: if available, otherwise "—"
     - Pagination: "Load more" button at the bottom (cursor-based, same pattern as aside)
4. **Empty state** (no logs match filters): "No activity found for the selected filters."
5. **Empty state** (workspace has no logs at all): "No activity recorded yet. Actions by workspace members will appear here."
6. **No aside panel** on this page — the page itself is the detailed view.

### Admin Flow — Aside Activity Tab (existing, preserved)

1. Admin selects a folder or file in the file browser.
2. The aside panel shows "Activity" tab with contextual logs for that item.
3. Behavior unchanged from current implementation — scoped to selected folder (with descendants) or vault.
4. This tab serves as a quick contextual shortcut; the dedicated page is for workspace-wide investigation.

### Admin Flow — CSV Export

1. Admin applies desired filters on the Audit Logs page.
2. Admin clicks "Export CSV".
3. A CSV file is generated client-side from the currently loaded (and decrypted) log entries.
4. File downloads automatically with name format: `audit-logs-{workspace-name}-{date}.csv`.
5. CSV columns: Timestamp, Actor Name, Actor Email, Action, Details, IP Address.
6. If no logs are loaded, the export button is disabled.

## Acceptance Criteria

### Must Have

1. Given an admin/owner is logged in, when they look at the navbar, then they see an "Audit Logs" icon between Users and Settings (visible only to admin/owner roles).

2. Given an admin clicks the "Audit Logs" navbar icon, when the page loads, then they see a full-width page with a filter bar and a table of workspace-wide audit log entries, newest first.

3. Given an admin is on the Audit Logs page, when audit log entries exist, then each row displays: timestamp, actor name, actor email, human-readable action label, contextual details (folder/file/member names), and IP address.

4. Given an admin is on the Audit Logs page, when they select a date range, then only logs within that range are shown. Server-side filtering by `createdAt`.

5. Given an admin is on the Audit Logs page, when they select one or more action types from the filter dropdown, then only logs matching those action types are shown. Server-side filtering by `actionType`.

6. Given an admin is on the Audit Logs page, when they select an actor from the filter dropdown, then only logs by that user are shown. Server-side filtering by `userId`.

7. Given an admin applies multiple filters simultaneously, when the table updates, then only logs matching ALL active filters are displayed.

8. Given more logs exist than one page can show, when the admin scrolls to the bottom, then a "Load more" button appears to fetch the next page (cursor-based pagination).

9. Given an admin clicks "Export CSV", then a CSV file containing all currently loaded and decrypted log entries (matching active filters) is downloaded with columns: Timestamp, Actor Name, Actor Email, Action, Details, IP Address.

10. Given the `auditLogs` database table, then it includes plaintext columns `userId` (UUID, references users) and `actionType` (varchar) to enable server-side filtering without decryption.

11. Given a member performs any of the 19 tracked action types, then an audit log entry is created with the correct `actionType`, `userId`, encrypted payload with context, and IP address.

12. Given admin invites, removes, or changes the role of a workspace member, then the corresponding `member.invited`, `member.removed`, or `member.role_changed` audit log is created.

13. Given a user successfully signs in, then an `auth.sign_in` audit log is created. Given a user signs out, then `auth.sign_out` is created. Given a user changes password, then `auth.password_changed` is created.

14. Given a member's folder access is revoked, then a `folder_acl.revoked` audit log is created with the member's name/email and folder name.

15. Given a non-admin member, when they attempt to access `/audit-logs` or the audit logs API, then access is denied and the page/navbar icon is not visible.

16. Given the existing aside Activity tab, when an admin selects a folder or file, then contextual audit logs continue to work as before (no regression).

17. Given no logs match the current filters, then the page shows "No activity found for the selected filters." with a suggestion to adjust filters.

18. Given the workspace has zero audit logs, then the page shows "No activity recorded yet. Actions by workspace members will appear here."

### Nice to Have

19. Given an admin is on the Audit Logs page, when they see a log entry with folder/file context, then clicking on the folder/file name navigates to that folder/file in the file browser.

20. Given an admin is on the Audit Logs page, then action types are visually grouped by category (File Actions, Member Actions, Auth Actions) in the filter dropdown.

21. Given `auth.failed_login` tracking, when a login attempt fails, then a log entry is created by the backend with the attempted email and IP address. (Note: requires backend-side log creation since workspace keys are unavailable on failed auth — encrypted payload would be empty or this event uses plaintext-only storage.)

22. Given an admin has exported a CSV, when the export is large (1000+ entries), then a loading indicator is shown during generation.

23. Given the Audit Logs page, then the admin can bookmark a filtered view via URL query parameters (e.g., `/audit-logs?action=vault.created&from=2026-10-01`).

## Out of Scope

| Item | Why excluded |
|------|-------------|
| **SIEM API integration** | Adds significant backend complexity. Revisit after CSV export validates demand. Dropbox has it, but it's an enterprise-tier feature. |
| **Real-time log streaming** | WebSocket/SSE for live updates is over-engineering for v1. Polling or manual refresh is sufficient. |
| **Log retention policy / auto-deletion** | Not needed for launch. Tresorit does 90 days; we can add configurable retention later. |
| **Per-member activity dashboard** | Google Workspace has per-user views. Not essential for v1 — the actor filter covers this use case. |
| **File version history** | Tracking file content changes (versions) is a separate feature, not audit logging. |
| **Geolocation from IP** | Displaying location based on IP adds dependency on a geolocation service. Store IP; geo can come later. |
| **`auth.failed_login` in Must Have** | Requires backend-side audit log creation without workspace encryption keys. Feasible but adds architectural complexity. Deferred to Nice to Have. |
| **Folder rename tracking (`folder.renamed`)** | Listed in the action types section above but marking as v2 scope — folder rename is not yet a feature in the app based on codebase review. Track it when the rename feature ships. |

## Open Decisions

| # | Decision | Resolution | Reasoning |
|---|----------|------------|-----------|
| 1 | Dedicated page + aside or aside only? | **Both** — dedicated page at `/audit-logs` + existing aside Activity tab preserved | Aside is great for contextual browsing; dedicated page is needed for investigations and compliance. All competitors offer a workspace-wide view. |
| 2 | Which action types to add? | **File + Member + Auth** — 19 total | Full security audit trail. Member management and auth events are critical for B2B compliance (who was added, who signed in from where). |
| 3 | CSV export? | **Yes** | All competitors offer export. Essential for regulatory compliance (GDPR, SOC2). Client-side generation from decrypted data keeps E2EE intact. |
| 4 | E2EE tradeoff for filtering? | **Store `actionType` + `userId` as plaintext columns** | These are metadata, not content. Same pattern as `folderId`/`vaultId` which are already plaintext. Enables efficient server-side filtering without compromising the E2EE model for actual log content. |

## UI Placement

- **Navbar icon**: New "Audit Logs" icon in `NavbarContent` (`packages/frontend/src/components/layout/AppShell/NavbarContent/index.tsx`), positioned after the Users icon. Wrapped in `RoleWrapper` with `allowedFor={["owner", "admin"]}`. Uses an appropriate Tabler icon (e.g., `IconClipboardList` or `IconFileAnalytics`).
- **Route**: `/audit-logs` added to `RouteEnum` and router config in `App.tsx`. Protected by `RoleWrapper`.
- **Page**: New `AuditLogsPage` in `packages/frontend/src/pages/AuditLogsPage/`.
- **Aside panel**: NOT shown on the Audit Logs page (same as Users page pattern — `useAppShellLayout` returns `asideVisible: false` for this route).
- **Aside Activity tab**: Unchanged at `packages/frontend/src/components/layout/AppShell/AsideContent/AuditLogSection/`.
