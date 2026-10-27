# Phase 1 — Backend: Folder Permissions

You are implementing Phase 1 (backend) of the Folder Permissions initiative for Tayemno, a B2B secure workspace with E2EE. This phase adds six boolean permission columns to the `folder_acls` table, creates a permission-resolution function, updates all 15 backend services to enforce specific permission flags, and adds a new endpoint for updating a member's folder role.

Working from the repo root: `/Users/inaurifam/Desktop/tayemno`

---

## Read first, in this exact order

1. `docs/folder-permissions/phase-1-backend/plan.md` — the authoritative plan. Follow it exactly.
2. `docs/folder-permissions/README.md` — decisions, verified findings, and behavioral changes.
3. `docs/folder-permissions/product-spec.md` — the product specification for context.
4. `packages/backend/src/db/schema.ts` — current database schema. Verify that `folderAcls` (around line 146) has NO permission columns.
5. `packages/backend/src/repositories/folderAcls/index.ts` — current repo functions. Verify `hasAccessToFolder` returns boolean.
6. `packages/backend/src/repositories/folders/index.ts` — `findByIdAndUserId` and other folder queries.
7. `packages/backend/src/services/folders/createFolderAcl/index.ts` — sibling pattern for how ACL services are structured.
8. `packages/backend/src/routes/folders/deleteFolderAcl/index.ts` — sibling pattern for how routes are structured.
9. `packages/shared/src/index.ts` — current shared types. Verify `FolderAcl`, `IFolderMemberItem`, `ICreateFolderAclRequest` shapes.

After reading these files, verify the key findings from the README match reality. If anything is different (columns moved, functions renamed, new files added), adapt the plan to match the actual code — but do NOT change the scope or behavior.

---

## The task

Follow the plan.md steps 1 through 14 exactly. Summary:

1. Add 6 boolean columns to `folderAcls` in `schema.ts` (canView, canDownload, canAdd, canEdit, canDelete, canManageMembers)
2. Generate migration with `npm run db:generate -w packages/backend`
3. Update shared types: add `FolderRole`, `IFolderPermissions`, `FOLDER_ROLE_PERMISSIONS`, `getFolderRoleFromPermissions`; update `FolderAcl`, `IFolderMemberItem`, `ICreateFolderAclRequest`, response types; add `IUpdateFolderAclRoleRequest/Response`; add `FOLDER_ACL_ROLE_CHANGED` audit action
4. Add `getPermissionsForFolder` to folderAcls repo (one SQL query with recursive CTE + LEFT JOIN LATERAL)
5. Add `updatePermissions` to folderAcls repo
6. Update `findAllByFolderIdWithAncestors` to return permission flags
7. Update 8 vault services: replace `hasAccessToFolder` with `getPermissionsForFolder` + specific flag check
8. Update 5 folder services: add `getPermissionsForFolder` check after `findByIdAndUserId`
9. Update 3 ACL services: add `canManageMembers` check, accept optional `role`, enforce Manager-assignment restrictions
10. Update `listFolderMembers` to return `role` per member
11. Return `permissions` in `getFolder`, `getFoldersByParent`, `getVaultsByFolder` responses
12. Update `findByUserIdAndWorkspaceId` to select permission columns
13. Create `updateFolderAclRole` service + route + register it
14. Remove `authorizeAdmin` preHandler from `bulkCreateFolderAcl` route

---

## Explicitly forbidden in this phase

- **No frontend changes.** Do not touch any file under `packages/frontend/`.
- **No Zod or runtime request validation.** Follow existing pattern (TypeScript generics only).
- **No permission caching or middleware.** Permission checks happen in each service function.
- **Do not delete `hasAccessToFolder`.** Keep it in the repo. It may still be referenced by inline SQL in `findByIdAndUserId`. It will become dead code — that's fine.
- **No changes to the `folders` table.** Only `folderAcls` gets new columns.
- **No per-subfolder override logic.** Permissions come from the nearest ancestor ACL, period.
- **No custom flag combinations beyond 3 roles.** The API accepts `role: "viewer" | "editor" | "manager"` — do not accept raw permission flags in request bodies.
- **Do not add audit log creation to the backend.** Audit events are created by the frontend (existing pattern). Only add the enum value.

---

## Hard rules

- **Do not modify `.claude/` or config files.**
- **Do not run `git push` or any destructive git commands.**
- **Do not run `npm run db:migrate` or `npm run db:push`.** Only generate the migration file.
- **Do not add comments, docstrings, or type annotations to code you didn't change.**
- **Frontend files must stay under 120 lines.** (Not relevant for this phase, but noted.)
- **Follow existing code style exactly** — arrow function exports, no default exports, same import patterns as sibling files.
- **No `Co-Authored-By` in commit messages.**

---

## Verify

After completing all steps, run:

```bash
npm run build -w packages/shared
npm run build -w packages/backend
npm run build -w packages/frontend
```

All three must succeed. The frontend build verifies that shared type changes are backward-compatible.

Then check the git diff scope:

```bash
git diff --name-only
```

**Expected files in the diff (and nothing else outside these directories):**

- `packages/backend/src/db/schema.ts`
- `packages/backend/drizzle/<new-migration>/migration.sql`
- `packages/backend/drizzle/meta/_journal.json` (auto-generated)
- `packages/backend/drizzle/meta/<snapshot>.json` (auto-generated)
- `packages/backend/src/repositories/folderAcls/index.ts`
- `packages/backend/src/repositories/folders/index.ts` (only if `findByIdAndUserId` is modified)
- `packages/backend/src/services/folders/*.ts` (~8 files)
- `packages/backend/src/services/vaults/*.ts` (~7 files)
- `packages/backend/src/routes/folders/bulkCreateFolderAcl/index.ts`
- `packages/backend/src/routes/folders/updateFolderAclRole/index.ts` (new)
- `packages/backend/src/routes/folders/index.ts`
- `packages/backend/src/services/folders/index.ts`
- `packages/shared/src/index.ts`

If any file outside these directories appears in the diff, investigate why before proceeding.

---

## Report

When done, summarize:
1. Number of files changed / created
2. Migration contents (the 6 ALTER TABLE statements)
3. `getPermissionsForFolder` — confirm it handles admin bypass, nearest-ancestor resolution, and null for no access
4. List of services updated and which flag each checks
5. `updateFolderAclRole` endpoint — confirm route registered and Manager-assignment restriction works
6. Build results for shared, backend, and frontend
7. Any deviations from the plan and why

Then stop — the user reviews before the next phase.
