# Phase 1 -- Schema + Backend

You are implementing Phase 1 of the Zero-Knowledge Folder Hierarchy initiative for the Tayemno monorepo. Working from the repo root at `/Users/inaurifam/Desktop/tayemno`. The backend is at `packages/backend/`, shared types at `packages/shared/`.

## Read first, in this exact order

1. `docs/zk-folder-hierarchy/phase-1-schema-backend/plan.md` -- the plan you must follow exactly.
2. `docs/zk-folder-hierarchy/README.md` -- context, decisions, verified findings, scope boundaries.
3. `.claude/backend/architecture.md` -- three-layer architecture, routes/services/repositories, Drizzle ORM, code style.
4. `.claude/encryption-key-hierarchy.md` -- current key hierarchy and storage mapping.
5. `packages/backend/src/db/schema.ts` -- current Drizzle schema you will modify.
6. `packages/shared/src/index.ts` -- current shared types you will modify.
7. `packages/backend/src/repositories/folders/index.ts` -- current folder queries you will rewrite.
8. `packages/backend/src/repositories/folderMembers/index.ts` -- the file you will delete and replace with `folderAcls`.
9. `packages/backend/src/services/folders/createFolder/index.ts` -- the service you will update.
10. `packages/backend/src/services/vaults/moveVault/index.ts` -- the pattern to follow for the new `moveFolder` service.
11. `packages/backend/src/routes/vaults/moveVault/index.ts` -- the pattern to follow for the new `moveFolder` route.
12. `packages/backend/src/routes/folders/index.ts` -- the route registry you will update.
13. `packages/backend/src/repositories/vaults/index.ts` -- has raw SQL referencing `folder_members` that must change to `folder_acls`.
14. `packages/backend/src/services/vaults/createVault/index.ts` -- references `folderMembersRepo` that must change to `folderAclsRepo`.
15. `packages/backend/src/services/vaults/deleteVault/index.ts` -- same `folderMembersRepo` reference to update.

## The task

Follow the plan exactly. In summary:

1. **Schema** (`db/schema.ts`): Add `wrappedKey` and `wrappedKeyNonce` nullable text columns to the `folders` table. Replace the `folderMembers` table with `folderAcls` (rename table and export, rename column `encrypted_symmetric_key` to `encrypted_folder_key`).

2. **Shared types** (`packages/shared/src/index.ts`): Add `wrappedKey`/`wrappedKeyNonce` to `Folder` and `NewFolder`. Replace `FolderMember`/`NewFolderMember` with `FolderAcl`/`NewFolderAcl`. Update `ICreateFolderRequest` (add `wrappedKey`, `wrappedKeyNonce`, rename `memberEncryptedSymmetricKey` to `aclEncryptedFolderKey`). Update `IGetAllFoldersResponse` to include `acls: FolderAcl[]`. Add `IMoveFolderRequest`, `IMoveFolderResponse`, `ICreateFolderAclRequest`, `ICreateFolderAclResponse`, `IDeleteFolderAclResponse`.

3. **Repository** (`repositories/folderAcls/index.ts`): Create new file with `create`, `findByFolderIdAndUserId`, `findByUserId`, `deleteByFolderIdAndUserId`. Delete `repositories/folderMembers/index.ts`.

4. **Repository** (`repositories/folders/index.ts`): Rewrite `findByIdAndUserId`, `findByWorkspaceIdAndUserId`, `findAllByUser`, `findBreadcrumbs` to use raw SQL with admin-or-ACL access checks (workspace role check OR recursive ancestor ACL check). Add `updateMove` method. All queries return the folder's own fields including the new `wrappedKey`/`wrappedKeyNonce` columns.

5. **Services**: Update `createFolder` to use `folderAclsRepo` and new request fields. Update `getAllFolders` to include ACLs in response. Create `moveFolder` service (pattern: moveVault). Create `createFolderAcl` and `deleteFolderAcl` services.

6. **Routes**: Create `moveFolder/index.ts` (PATCH `/:folderId/move`), `createFolderAcl/index.ts` (POST `/:folderId/acl`), `deleteFolderAcl/index.ts` (DELETE `/:folderId/acl/:userId`). Register all three in the folder routes index.

7. **Vault references**: Update all `folderMembersRepo` imports/calls in vault services (`moveVault`, `createVault`, `deleteVault`) to `folderAclsRepo`. Update raw SQL in `repositories/vaults/index.ts` to reference `folder_acls` instead of `folder_members`.

8. **Push schema**: Run `npm run db:push -w packages/backend`.

## Explicitly forbidden in this phase

- Do NOT create or modify any files in `packages/frontend/`.
- Do NOT create React hooks, components, or client-side crypto utilities.
- Do NOT add i18n keys or translation entries.
- Do NOT install new npm dependencies.
- Do NOT create migration files -- use `db:push` only (no production data).
- Do NOT add per-folder roles or permissions to the ACL table.
- Do NOT modify standalone vault encryption behavior.
- Do NOT add sharing UI or user search functionality.

## Hard rules

- Arrow functions only -- no `function` keyword.
- Interfaces prefixed with `I` (e.g., `IMoveFolderRequest`).
- Folder-based file structure: `serviceName/index.ts`.
- Each service function in its own subfolder under `services/<domain>/<function>/index.ts`.
- Repository functions all in one file per domain: `repositories/<domain>/index.ts`.
- Import conventions: external libs -> `@tayemno/shared` -> internal modules. Folder modules without `/index.js`, single files with `.js` extension.
- Do NOT commit or push.
- Do NOT run destructive git commands.

## Verify

Run these commands after implementation:

```bash
# TypeScript must compile without errors
npx tsc --noEmit -p packages/backend/tsconfig.json

# Shared package must compile
npx tsc --noEmit -p packages/shared/tsconfig.json

# Push schema (will drop folder_members, create folder_acls, add columns)
npm run db:push -w packages/backend
```

Check `git diff --stat` -- only these paths should appear:

**Modified:**
- `packages/backend/src/db/schema.ts`
- `packages/shared/src/index.ts`
- `packages/backend/src/repositories/folders/index.ts`
- `packages/backend/src/repositories/vaults/index.ts`
- `packages/backend/src/services/folders/createFolder/index.ts`
- `packages/backend/src/services/folders/getAllFolders/index.ts`
- `packages/backend/src/services/folders/getFoldersByParent/index.ts`
- `packages/backend/src/services/folders/getFolder/index.ts`
- `packages/backend/src/services/folders/getBreadcrumbs/index.ts`
- `packages/backend/src/services/folders/index.ts`
- `packages/backend/src/routes/folders/index.ts`
- `packages/backend/src/services/vaults/moveVault/index.ts`
- `packages/backend/src/services/vaults/createVault/index.ts`
- `packages/backend/src/services/vaults/deleteVault/index.ts`

**New:**
- `packages/backend/src/repositories/folderAcls/index.ts`
- `packages/backend/src/services/folders/moveFolder/index.ts`
- `packages/backend/src/services/folders/createFolderAcl/index.ts`
- `packages/backend/src/services/folders/deleteFolderAcl/index.ts`
- `packages/backend/src/routes/folders/moveFolder/index.ts`
- `packages/backend/src/routes/folders/createFolderAcl/index.ts`
- `packages/backend/src/routes/folders/deleteFolderAcl/index.ts`

**Deleted:**
- `packages/backend/src/repositories/folderMembers/index.ts`

Nothing in `packages/frontend/` should appear.

## Report

When done, summarize:
1. Exact files created/modified/deleted with line counts.
2. Whether `tsc --noEmit` passed for backend and shared.
3. Whether `db:push` succeeded (or instructions if DB is not running).
4. The new API endpoints: method, path, request/response types.
5. Any issues encountered and how they were resolved.
6. Any deviations from the plan (with justification).

Then stop -- the user reviews before Phase 2.
