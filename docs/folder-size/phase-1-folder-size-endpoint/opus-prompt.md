# Phase 1 — Folder Size Endpoint + UI

You are implementing phase 1 (the only phase) of the Folder Size Display initiative. Working from the repo root.

This phase adds a `GET /workspaces/:workspaceId/folders/:folderId/size` endpoint that computes total original and encrypted sizes of all vaults recursively nested under a folder, a frontend hook to fetch it per folder, and a wrapper component that wires the sizes into the existing file list UI.

---

## Read first, in this exact order

1. `docs/folder-size/phase-1-folder-size-endpoint/plan.md` — the detailed plan with exact code. Follow it exactly.
2. `.claude/backend/architecture.md` — three-layer architecture, routes/services/repositories, code style.
3. `.claude/frontend/code-style.md` — arrow functions, interface naming, import conventions.
4. `.claude/frontend/api-guide.md` — two-layer hook pattern, QueryKeyEnum, EndpointEnum.
5. `packages/backend/src/repositories/folders/index.ts` — existing repository with recursive CTE pattern in `findAncestors`.
6. `packages/backend/src/services/folders/getFolder/index.ts` — sibling service to imitate (access control + return pattern).
7. `packages/backend/src/routes/folders/getFolder/index.ts` — sibling route to imitate (Params typing, error handling).
8. `packages/backend/src/routes/folders/index.ts` — where to register the new route.
9. `packages/backend/src/services/folders/index.ts` — barrel export to update.
10. `packages/frontend/src/api/hooks/useGetFolder/index.ts` — sibling hook to imitate.
11. `packages/frontend/src/components/files/FoldersList/index.tsx` — component to refactor.
12. `packages/frontend/src/components/files/FileListItem/index.tsx` — size display guards to update.
13. `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` — add FOLDER_SIZE.
14. `packages/shared/src/index.ts` — add IGetFolderSizeResponse.

---

## The task

Follow the plan in `plan.md` exactly. Ten steps:

1. **Edit** `packages/backend/src/repositories/folders/index.ts` — add `findDescendantSizes` function with recursive CTE.
2. **Create** `packages/backend/src/services/folders/getFolderSize/index.ts` — access control via folderMembers, call `findDescendantSizes`, return sizes.
3. **Create** `packages/backend/src/routes/folders/getFolderSize/index.ts` — route at `/:folderId/size`.
4. **Edit** `packages/backend/src/routes/folders/index.ts` and `packages/backend/src/services/folders/index.ts` — register route, export service.
5. **Edit** `packages/shared/src/index.ts` — add `IGetFolderSizeResponse` interface.
6. **Edit** `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` — add `FOLDER_SIZE`.
7. **Create** `packages/frontend/src/api/hooks/useGetFolderSize/index.ts` — query hook.
8. **Create** `packages/frontend/src/components/files/FolderListItem/index.tsx` — wrapper that calls `useGetFolderSize` and renders `FileListItem`.
9. **Edit** `packages/frontend/src/components/files/FoldersList/index.tsx` — replace `FileListItem` with `FolderListItem`.
10. **Edit** `packages/frontend/src/components/files/FileListItem/index.tsx` — remove `!isFolder` guards from size display.

---

## Explicitly forbidden in this phase

- Do NOT add size fields to the `Folder` interface or folders DB schema.
- Do NOT create a batch endpoint for multiple folder sizes.
- Do NOT add loading skeletons, spinners, or error states for pending size requests.
- Do NOT add caching beyond React Query's default behavior.
- Do NOT modify the vaults table, vault routes, or vault services.
- Do NOT modify the `useGetFolders` hook or `getFolders` service.
- Do NOT add workspace-level size aggregation.

---

## Hard rules

- Arrow functions only — never use the `function` keyword.
- Interface names must be prefixed with `I`.
- Folder-based file structure: `ComponentName/index.tsx`, `serviceName/index.ts`.
- Import order: external libraries first, then internal modules, separated by a blank line.
- Never use raw numbers for spacing — use `SizeEnum`.
- Do NOT commit or push.
- Do NOT run destructive git commands.

---

## Verify

Run:
```bash
npm run build -w packages/frontend
```

Then check git diff scope:
```bash
git diff --name-only
git ls-files --others --exclude-standard
```

Expected files:
- `packages/backend/src/repositories/folders/index.ts` (modified)
- `packages/backend/src/services/folders/getFolderSize/index.ts` (new)
- `packages/backend/src/services/folders/index.ts` (modified)
- `packages/backend/src/routes/folders/getFolderSize/index.ts` (new)
- `packages/backend/src/routes/folders/index.ts` (modified)
- `packages/shared/src/index.ts` (modified)
- `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` (modified)
- `packages/frontend/src/api/hooks/useGetFolderSize/index.ts` (new)
- `packages/frontend/src/components/files/FolderListItem/index.tsx` (new)
- `packages/frontend/src/components/files/FoldersList/index.tsx` (modified)
- `packages/frontend/src/components/files/FileListItem/index.tsx` (modified)

No other files should be in the diff.

---

## Report

Summarize what was created/changed, confirm the frontend build passes, confirm the diff scope matches the 11 files above. Then stop — the user reviews before merging.
