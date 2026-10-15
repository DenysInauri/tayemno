# Phase 1: Backend — Folder Member APIs

You are implementing Phase 1 of the "Folder Member Management" initiative in a monorepo at the repo root. This phase adds backend API endpoints for listing folder members and bulk-adding folder ACLs, plus adds `publicKey` to the workspace members response.

## Step 0 — Verify prerequisites

No earlier phases are required. Verify the repo is clean and the following files exist:

- `packages/shared/src/index.ts` — shared types (look for `IMemberItem` interface)
- `packages/backend/src/repositories/folderAcls/index.ts` — folder ACL repository
- `packages/backend/src/services/folders/createFolderAcl/index.ts` — existing single-ACL service
- `packages/backend/src/services/folders/deleteFolderAcl/index.ts` — existing delete-ACL service
- `packages/backend/src/routes/folders/index.ts` — folder routes index
- `packages/backend/src/services/folders/index.ts` — folder services barrel

If any are missing, STOP and report.

## Read first, in this exact order

1. `docs/folder-member-management/phase-1-backend-apis/plan.md` — the detailed plan for this phase
2. `.claude/backend/architecture.md` — backend three-layer conventions
3. `packages/backend/src/services/folders/createFolderAcl/index.ts` — the sibling service pattern to copy
4. `packages/backend/src/routes/folders/createFolderAcl/index.ts` — the sibling route pattern to copy
5. `packages/backend/src/repositories/folderAcls/index.ts` — existing repo to extend
6. `packages/backend/src/repositories/workspaceMembers/index.ts` — the `findAllByWorkspaceId` method to modify (add `publicKey`)
7. `packages/backend/src/services/members/listMembers/index.ts` — the `listMembers` service to modify (add `publicKey` mapping)
8. `packages/shared/src/index.ts` — all shared types (read fully)
9. `packages/backend/src/routes/folders/index.ts` — where to register new routes
10. `packages/backend/src/services/folders/index.ts` — where to export new services
11. `packages/backend/src/utils/mapTimestamps/index.ts` — utility used by services
12. `packages/backend/src/utils/httpError/index.ts` — error class used by services

## The task

Follow the plan exactly. The steps are:

1. Add `publicKey: string` to `IMemberItem` in `packages/shared/src/index.ts`
2. Add `publicKey: users.publicKey` to the select in `workspaceMembers` repo `findAllByWorkspaceId`
3. Add `publicKey: row.publicKey` to the `listMembers` service mapping
4. Add shared types: `IFolderMemberItem`, `IListFolderMembersResponse`, `IBulkCreateFolderAclRequest`, `IBulkCreateFolderAclResponse`
5. Add `findAllByFolderId` method to `folderAcls` repo (join with `users` table)
6. Add `bulkCreate` method to `folderAcls` repo
7. Create `listFolderMembers` service at `packages/backend/src/services/folders/listFolderMembers/index.ts`
8. Create `bulkCreateFolderAcl` service at `packages/backend/src/services/folders/bulkCreateFolderAcl/index.ts`
9. Export both new services from `packages/backend/src/services/folders/index.ts`
10. Create `listFolderMembersRoute` at `packages/backend/src/routes/folders/listFolderMembers/index.ts`
11. Create `bulkCreateFolderAclRoute` at `packages/backend/src/routes/folders/bulkCreateFolderAcl/index.ts`
12. Register both new routes in `packages/backend/src/routes/folders/index.ts`

## Explicitly forbidden in this phase

- Do NOT touch any frontend files (`packages/frontend/`)
- Do NOT create database migrations or modify `packages/backend/src/db/schema.ts`
- Do NOT modify existing `createFolderAcl` or `deleteFolderAcl` services/routes
- Do NOT add authorization middleware changes — the existing `authenticate` + `requirePasswordChanged` hooks on the folder routes index are sufficient
- Do NOT add endpoint-level role checks (admin/owner) — folder access is verified inside each service via `foldersRepo.findByIdAndUserId`

## Hard rules

- Arrow functions only (no `function` keyword in new code)
- Interfaces prefixed with `I`
- Each new file goes in its own folder: `serviceName/index.ts`
- Follow the exact patterns from the sibling files listed above
- Do NOT commit or push
- Do NOT run destructive git commands

## Verify

```bash
cd packages/backend && npx tsc --noEmit
```

Run a git diff scope check. The diff should touch ONLY these files/folders:

- `packages/shared/src/index.ts`
- `packages/backend/src/repositories/folderAcls/index.ts`
- `packages/backend/src/repositories/workspaceMembers/index.ts`
- `packages/backend/src/services/members/listMembers/index.ts`
- `packages/backend/src/services/folders/index.ts`
- `packages/backend/src/services/folders/listFolderMembers/index.ts` (new)
- `packages/backend/src/services/folders/bulkCreateFolderAcl/index.ts` (new)
- `packages/backend/src/routes/folders/index.ts`
- `packages/backend/src/routes/folders/listFolderMembers/index.ts` (new)
- `packages/backend/src/routes/folders/bulkCreateFolderAcl/index.ts` (new)

Nothing else should appear in the diff.

## Report

When done, summarize:
1. Which files were created and modified
2. The `tsc --noEmit` result
3. The `git diff --stat` output
4. Any issues encountered

Then stop — the user reviews before the next phase.
