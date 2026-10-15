# Phase 2: Frontend — Display Folder Members & Revoke Access

You are implementing Phase 2 of the "Folder Member Management" initiative in a monorepo at the repo root. This phase builds the UI to display folder members in the aside panel with search, a virtualized list, 3-dot menu, and revoke access.

## Step 0 — Verify prerequisites

Phase 1 must be merged. Verify these exist:

- `packages/shared/src/index.ts` — must contain `IFolderMemberItem`, `IListFolderMembersResponse`, and `publicKey` in `IMemberItem`
- `packages/backend/src/routes/folders/listFolderMembers/index.ts` — the `GET /:folderId/members` route
- `packages/backend/src/routes/folders/bulkCreateFolderAcl/index.ts` — the `POST /:folderId/acl/bulk` route

If any are missing, STOP and report — Phase 1 was not completed.

## Read first, in this exact order

1. `docs/folder-member-management/phase-2-frontend-display-revoke/plan.md` — the detailed plan
2. `docs/folder-member-management/README.md` — overall context and decisions
3. `.claude/frontend/code-style.md` — code conventions
4. `.claude/frontend/ui-guide.md` — wrapper component patterns
5. `.claude/frontend/api-guide.md` — two-layer hook pattern
6. `packages/frontend/src/components/layout/AppShell/AsideContent/index.tsx` — current aside (will be modified)
7. `packages/frontend/src/pages/UsersPage/index.tsx` — the sibling pattern for member list + search
8. `packages/frontend/src/pages/UsersPage/UsersTable/index.tsx` — virtualization pattern to copy
9. `packages/frontend/src/pages/UsersPage/UsersTable/MemberRow/index.tsx` — row component pattern
10. `packages/frontend/src/pages/UsersPage/UsersTable/MemberRowActions/index.tsx` — 3-dot menu pattern to copy
11. `packages/frontend/src/api/hooks/useGetMembers/index.ts` — API hook pattern to copy
12. `packages/frontend/src/api/hooks/useDeleteMember/index.ts` — delete mutation pattern (check how delete is implemented — may use `useApiPost` since the delete endpoint uses POST)
13. `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` — existing enum values
14. `packages/frontend/src/enums/api/EndpointEnum/index.ts` — existing enum values
15. `packages/frontend/src/components/ui/Text/index.tsx` — check if exists
16. `packages/frontend/src/components/ui/Stack/index.tsx` — check if exists
17. `packages/shared/src/index.ts` — verify `IFolderMemberItem` type shape

## The task

Follow the plan exactly. The steps are:

1. Add `FOLDER_MEMBERS = "folderMembers"` to `QueryKeyEnum`
2. Handle `EndpointEnum` for folder members URL path (check if a new enum value is needed or if inline string is cleaner given the existing `MEMBERS` value)
3. Create `useGetFolderMembers` hook at `packages/frontend/src/api/hooks/useGetFolderMembers/index.ts`
4. Create `useDeleteFolderAcl` hook at `packages/frontend/src/api/hooks/useDeleteFolderAcl/index.ts` — check how existing delete hooks work (the workspace member delete uses POST, but folder ACL delete uses actual DELETE method)
5. Create `FolderMemberRow` at `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMemberRow/index.tsx`
6. Create `FolderMembersList` at `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMembersList/index.tsx` — fixed height for 5 visible rows, virtualized
7. Create `FolderMembersSection` at `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx`
8. Modify `AsideContent` — add `useParams` to get `folderId`, render `FolderMembersSection` when folderId exists, empty state otherwise
9. Add i18n keys to `packages/frontend/src/i18n/locales/en.json` under `aside.members`
10. Verify `Text` and `Stack` UI wrappers exist; create if missing

## Explicitly forbidden in this phase

- Do NOT touch backend files (`packages/backend/`)
- Do NOT implement the "add member" button or MultiSelect — that is Phase 3
- Do NOT add confirmation modals for revoke — out of scope
- Do NOT modify `AppShell/index.tsx` or `useAppShellLayout` — AsideContent gets `folderId` via `useParams`, not props
- Do NOT add mobile-specific styles
- Do NOT create new UI wrapper components beyond what's needed (Text, Stack if missing)

## Hard rules

- All files under 120 lines (150 max)
- Arrow functions only
- Interfaces prefixed with `I`
- `SizeEnum` for all numeric spacing values
- `ComponentName/index.tsx` folder convention
- i18n keys as `aside.members.<section>.<detail>`
- Do NOT commit or push
- Do NOT run destructive git commands

## Verify

```bash
npm run build -w packages/frontend
```

Run a git diff scope check. The diff should touch ONLY:

- `packages/frontend/src/enums/api/QueryKeyEnum/index.ts`
- `packages/frontend/src/enums/api/EndpointEnum/index.ts` (maybe)
- `packages/frontend/src/api/hooks/useGetFolderMembers/index.ts` (new)
- `packages/frontend/src/api/hooks/useDeleteFolderAcl/index.ts` (new)
- `packages/frontend/src/components/layout/AppShell/AsideContent/index.tsx`
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx` (new)
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMembersList/index.tsx` (new)
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMemberRow/index.tsx` (new)
- `packages/frontend/src/i18n/locales/en.json`
- `packages/frontend/src/components/ui/Text/index.tsx` (only if it didn't exist)
- `packages/frontend/src/components/ui/Stack/index.tsx` (only if it didn't exist)

Nothing else should appear in the diff.

## Report

When done, summarize:
1. Which files were created and modified
2. The `npm run build` result
3. The `git diff --stat` output
4. Any issues encountered or decisions made (e.g., how `useDeleteFolderAcl` was implemented)

Then stop — the user reviews before the next phase.
