# Folder Permissions

## Problem Statement

Tayemno currently has binary folder access — a user either has full access to a folder or none at all. Workspace owners and admins cannot restrict what members do inside shared folders (e.g., prevent downloading sensitive accounting files while still allowing uploads). This limits Tayemno's viability for organizations that need compartmentalized access, such as separating read-only archives from collaborative workspaces or restricting sensitive departments to upload-only for non-privileged staff.

## User Roles

| Workspace Role | Interaction with Folder Permissions |
|---|---|
| **Owner / Admin** | Bypass all folder permissions. Always have full access. Can assign any folder role (Viewer, Editor, Manager) to members. |
| **Member** | Subject to folder permissions. Gets a role per folder via ACL. |
| **External Member** | Subject to folder permissions. Gets a role per folder via ACL. |

## Competitor Summary

| Competitor | What they offer | Key takeaway |
|---|---|---|
| **Proton Drive** | 2 roles (Editor, Viewer). No download restriction for members. | Minimum viable — but heavily criticized by users for lacking granularity. |
| **Tresorit** | 4 roles (Owner, Manager, Editor, Viewer). Download restriction only on links, not members. | Sweet spot for E2EE products. Manager role solves the "sharing bottleneck." |
| **Google Drive** | 5 roles in Shared Drives. Can restrict downloads for Viewers via settings toggle. | Moving toward folder-level-only permissions (away from per-file). |
| **Dropbox Business** | 2 roles (Can edit, Can view). No download restriction for members. | Simple but frequently criticized as insufficient for enterprise use. |
| **Box Enterprise** | 7 roles including Previewer (no download) and Uploader (write-only, no read). | Gold standard for granularity, but users find it confusing. |
| **SharePoint** | 7 built-in roles + custom permission levels from 33 individual flags. | Most powerful, most criticized for unmanageable complexity. |

## Folder Roles

Three predefined roles. Stored in the database as individual permission flags for future extensibility.

### Role Definitions

| | Viewer | Editor | Manager |
|---|---|---|---|
| **CanView** | + | + | + |
| **CanDownload** | + | + | + |
| **CanAdd** | - | + | + |
| **CanEdit** | - | + | + |
| **CanDelete** | - | + | + |
| **CanManageMembers** | - | - | + |

- **Viewer** — Can see folder contents and download files. Cannot add, rename, or delete anything.
- **Editor** — Full content access: can view, download, add files/folders, rename (when implemented), and delete.
- **Manager** — Editor + can add and remove folder members (Viewer/Editor only; cannot assign or remove Managers).

### Database Storage

Six boolean flags stored per ACL entry in the `folderAcls` table: `canView`, `canDownload`, `canAdd`, `canEdit`, `canDelete`, `canManageMembers`. The UI presents these as named roles; the backend stores and enforces individual flags.

CanView and CanDownload are always set to the same value for the three launch roles. They are stored as separate flags so that a future "preview-only" mode (view without download) can be introduced without a database migration.

CanEdit is stored and set per role definition but is not enforced by the backend until file/folder renaming is implemented. When rename ships, Editor and Manager will already have the correct flag.

### Flag Defaults for Existing ACLs

Existing `folderAcls` entries (created before this feature) are treated as **Editor** role — all content flags true, `canManageMembers` false. This preserves the current behavior where sharing a folder gives full content access.

## User Flow

### Admin Flow

1. Admin opens a folder's member panel (existing `FolderMembersSection` in the aside).
2. For each member, a role dropdown appears next to their name showing their current role (Viewer / Editor / Manager).
3. Admin can change any member's role via the dropdown. Change takes effect immediately.
4. When adding a new member to a folder, the default role in the dropdown is **Viewer**.
5. Admin can assign any role, including Manager.

### Manager Flow

1. Manager sees the same member panel as Admin.
2. Manager can add new members with Viewer or Editor role (not Manager).
3. Manager can remove members who have Viewer or Editor role.
4. Manager cannot see or modify other Managers' access.
5. Manager cannot change their own role.

### Member / External Member Flow

1. Member sees the member list but without role dropdowns or add/remove controls (read-only view, same as current behavior for non-admins).
2. Member's actions within the folder are constrained by their role:
   - **Viewer**: file list is visible, file preview works, download button works. Upload button, create-folder button, delete button, and move-to-this-folder are hidden or disabled.
   - **Editor**: everything is enabled except the member management section.
   - **Manager**: everything is enabled, including adding/removing Viewer/Editor members.

### Permission Enforcement

| Action | Required Flag | Notes |
|---|---|---|
| See folder contents (file list) | `canView` | |
| Preview / open a file | `canView` | |
| Download a file | `canDownload` | |
| Download a folder (as zip) | `canDownload` | |
| Upload a file | `canAdd` | |
| Create a subfolder | `canAdd` | |
| Move a file/folder INTO this folder | `canAdd` | Checked on the **target** folder |
| Move a file/folder OUT of this folder | `canDelete` | Removing from source = deletion from source |
| Rename a file/folder | `canEdit` | Not enforced until rename feature ships |
| Delete a file/folder | `canDelete` | |
| Add a member (Viewer/Editor) | `canManageMembers` | Managers only — cannot add Managers |
| Remove a member (Viewer/Editor) | `canManageMembers` | Managers only — cannot remove Managers |
| Change a member's role | `canManageMembers` | Managers: only between Viewer and Editor |
| Assign/remove Manager role | — | Admin/Owner only, regardless of flags |

### Permission Inheritance

Permissions inherit from parent to child folders. If a user has Editor role on a parent folder, they have Editor role on all subfolders automatically. Per-subfolder role overrides are not supported — the role is determined by the ACL entry on the folder or its nearest ancestor with an ACL for that user.

### Move Behavior

Moving a file/folder from folder A to folder B requires:
- `canDelete` on folder A (the source — removing an item is a form of deletion)
- `canAdd` on folder B (the target)

If a user is Editor on folder A but Viewer on folder B, they cannot move items from A to B (no `canAdd` on B). This is enforced on the backend; the UI disables the target folder in the move dialog if the user lacks `canAdd`.

## Acceptance Criteria

### Must Have

1. Given a workspace admin, when they open the folder member panel, then each member shows a role dropdown with Viewer / Editor / Manager options.
2. Given a workspace admin, when they change a member's role, then the new permissions take effect immediately on subsequent requests.
3. Given a member with Viewer role on a folder, when they open that folder, then they can see the file list and preview/download files, but upload, create-folder, delete, and move-into controls are hidden or disabled.
4. Given a member with Editor role on a folder, when they attempt to upload a file, then the upload succeeds.
5. Given a member with Viewer role on a folder, when they attempt to upload a file via API (bypassing UI), then the server returns 403 Forbidden.
6. Given a member with Editor role on folder A and Viewer role on folder B, when they attempt to move a file from A to B, then the move is rejected (no `canAdd` on B).
7. Given a member with Manager role, when they open the folder member panel, then they can add new members with Viewer or Editor role and remove existing Viewer/Editor members.
8. Given a member with Manager role, when they attempt to add a member as Manager, then the option is not available.
9. Given existing folder ACLs (created before this feature), when the system reads their permissions, then they are treated as Editor role (all content flags true, `canManageMembers` false).
10. Given a workspace admin or owner, when they access any folder, then all permission checks are bypassed — full access regardless of ACL flags.
11. Given a member with Editor role, when they create a subfolder, then the subfolder inherits the same permissions for all members of the parent.
12. Given a member adding a new member to a folder, when the role dropdown appears, then the default selection is Viewer.

### Nice to Have

13. Given a workspace admin, when they bulk-share a folder with multiple members, then they can set different roles for each member in a single operation.
14. Given a member with any role on a folder, when they view the member panel, then inherited members show "Inherited from [ancestor folder name]" with their effective role.
15. Given a workspace admin, when they view audit logs, then folder role changes appear as audit events with the old and new role.

## Out of Scope

| Exclusion | Reason |
|---|---|
| **Custom permission flag combinations** | 3 predefined roles cover 95%+ of use cases. Individual flag customization can be added later without database changes since flags are stored individually. |
| **Preview-only mode (CanView without CanDownload)** | In E2EE context, if the client decrypts for preview, blocking download is a UI restriction only. Low demand among E2EE competitors. Flags are stored separately for future enablement. |
| **Upload-only role (CanAdd without CanView)** | Niche enterprise use case. Only Box offers it. Can be added as a 4th role later. |
| **Per-subfolder role overrides** | Adds inheritance complexity (SharePoint's biggest criticism). Parent role applies to all descendants. |
| **Access expiration** | Valuable but independent feature. Can be built separately without affecting the permission model. |
| **Watermarking** | Only Box offers this. Significant implementation effort for marginal security benefit in E2EE context. |

## Open Decisions

| Decision | Resolution | Reasoning |
|---|---|---|
| Roles vs. individual flags | 3 fixed roles in UI, individual flags in DB | Matches Tresorit's approach. Simple UX now, extensible later. |
| CanView and CanDownload separation | Always set together for launch; stored as separate flags | Future-proofs for preview-only mode without migration. |
| CanEdit enforcement | Stored but not enforced until rename feature ships | Avoids migration and role redefinition later. |
| Default role when sharing | Viewer | Principle of least privilege. Safer to under-grant than over-grant. |
| Manager privileges | Can add/remove Viewer and Editor. Cannot assign Manager. | Prevents privilege escalation. Only admins assign Managers. |
| Move permission model | Requires `canDelete` on source + `canAdd` on target | Logical: removing from source = deletion, adding to target = addition. |
| Existing ACL migration | Treated as Editor | Preserves current behavior — all shared users currently have full content access. |

## UI Placement

### Folder Member Panel (existing)

Location: `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/`

Changes to existing components:
- **`FolderMemberRow`** — Add a role dropdown (Viewer / Editor / Manager) next to each member's name. Visible to admins and Managers. Read-only for other roles.
- **`AddMemberSelect`** — Add a role dropdown next to the "Add" action. Default: Viewer.

### Folder Content Area

- Upload button, create-folder button, delete button: hidden or disabled when the current user's role lacks the corresponding flag.
- Move dialog: target folders where user lacks `canAdd` are disabled in the folder tree.
- Download button: always visible for the 3 launch roles (CanDownload is always true). Will need conditional visibility if preview-only mode is added later.

### No New Pages or Navigation Items

This feature modifies existing UI elements only. No new routes, pages, or navigation entries are required.
