# Phase 2 — Frontend: Folder Permissions

You are implementing Phase 2 (frontend) of the Folder Permissions initiative for Tayemno, a B2B secure workspace with E2EE. Phase 1 (backend) has already been merged — the API now returns permission flags and accepts role parameters. This phase adds permission-aware UI: role dropdowns in the member panel, conditional action buttons, and aside panel visibility for Managers.

Working from the repo root: `/Users/inaurifam/Desktop/tayemno`

---

## Step 0 — Verify prerequisites

Phase 1 must be merged. Verify these exist before proceeding:

1. Read `packages/shared/src/index.ts` and confirm:
   - `FolderRole` type exported (`"viewer" | "editor" | "manager"`)
   - `IFolderPermissions` interface exported (6 boolean fields)
   - `FOLDER_ROLE_PERMISSIONS` constant exported
   - `getFolderRoleFromPermissions` function exported
   - `IFolderMemberItem` has `role: FolderRole` field
   - `ICreateFolderAclRequest` has `role?: FolderRole` field
   - `IGetFoldersByParentResponse` has `permissions: IFolderPermissions`
   - `IGetVaultsByFolderResponse` has `permissions: IFolderPermissions`
   - `AuditActionEnum.FOLDER_ACL_ROLE_CHANGED` exists
   - `IUpdateFolderAclRoleRequest` and `IUpdateFolderAclRoleResponse` exported

2. Verify the backend endpoint exists:
   ```bash
   grep -r "updateFolderAclRole" packages/backend/src/routes/folders/index.ts
   ```

If anything is missing, **STOP and report** — do not improvise or create backend code.

---

## Read first, in this exact order

1. `docs/folder-permissions/phase-2-frontend/plan.md` — the authoritative plan. Follow it exactly.
2. `docs/folder-permissions/README.md` — decisions and verified findings.
3. `docs/folder-permissions/product-spec.md` — product specification.
4. `.claude/CLAUDE.md` — project rules (120-line limit, CSS modules, no nested ternaries, i18n patterns).
5. These existing files (to understand current patterns before modifying them):
   - `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx`
   - `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMemberRow/index.tsx`
   - `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/AddMemberSelect/index.tsx`
   - `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/buildAddMembersPayload/index.ts`
   - `packages/frontend/src/components/files/AddNewEntity/index.tsx`
   - `packages/frontend/src/components/files/FolderListItem/index.tsx`
   - `packages/frontend/src/components/files/VaultListItem/index.tsx`
   - `packages/frontend/src/components/files/PreviewOverlay/PreviewHeader/index.tsx`
   - `packages/frontend/src/components/files/MoveItemModal/index.tsx`
   - `packages/frontend/src/components/layout/AppShell/useAppShellLayout/index.ts`
   - `packages/frontend/src/components/routing/RoleWrapper/index.tsx`
6. Find and read the API hooks for folders/vaults (`useGetFolders` or similar — search for `QueryKeyEnum.FOLDERS`)
7. Find and read the i18n translation files to understand existing key structure

---

## The task

Follow plan.md steps 1 through 16 exactly. Summary:

1. Create `usePatchFolderAclRole` API hook (PATCH endpoint for role updates)
2. Update `useGetFolders`/`useGetVaults` hooks to expose `permissions` from response
3. Create `useFolderPermissions` convenience hook (or skip if passing props is simpler)
4. Update `FolderMemberRow` — add role dropdown, disabled for inherited/self, Manager option admin-only
5. Update `AddMemberSelect` — add role selector dropdown, default Viewer
6. Update `FolderMembersSection` — pass `canManageMembers`/`isAdmin` down, include role in ACL payload
7. Update `useAppShellLayout` — show aside for all members on file routes (not just admin/owner)
8. Update `AddNewEntity` — show upload/create only when `canAdd`
9. Update `FolderListItem` — hide Move/Delete when user lacks `canDelete`
10. Update `VaultListItem` — same as above
11. Update `PreviewHeader` — conditionally show download (future-proofing)
12. Update `MoveItemModal` — disable folders where user lacks `canAdd`
13. Wire permissions through `HomePage` → child components
14. Update `buildAddMembersPayload` to include selected role
15. Add i18n keys for role labels (all existing languages)
16. Add audit logging for role changes

---

## Explicitly forbidden in this phase

- **No backend changes.** Do not touch files under `packages/backend/`.
- **No shared type changes.** Do not modify `packages/shared/src/index.ts` — Phase 1 already set up all types.
- **No permission context provider.** Pass permissions as props. Do not create a React context for permissions.
- **No new API endpoints.** All endpoints exist from Phase 1.
- **No mobile-responsive styles.** Desktop/tablet only per CLAUDE.md.
- **No inline styles for static values.** Use CSS modules.
- **No nested ternaries.** Use `useMemo` with if/return or conditional rendering.
- **Do not add Zod validation** to API hooks.
- **Do not add error handling beyond what exists** in sibling components.

---

## Hard rules

- **All frontend files must stay under 120 lines (150 max).** If a file grows past 120 lines after changes, extract logic into a subfolder following the `functionName/index.ts` convention. Check the line count of every modified file.
- **CSS modules only.** No inline `style={{}}` for static styles. Use `index.module.css` co-located with the component.
- **i18n keys for all user-visible strings.** No hardcoded English text.
- **No nested ternaries.** Use `if`/`return` in `useMemo` for multi-branch logic.
- **Do not modify `.claude/` or config files.**
- **Do not run `git push` or destructive git commands.**
- **No `Co-Authored-By` in commit messages.**
- **Follow existing patterns exactly** — same import style, same component structure, same hook patterns as sibling files.

---

## Verify

After completing all steps:

```bash
npm run build -w packages/frontend
```

Must succeed with no errors.

Then check the git diff scope:

```bash
git diff --name-only
```

**Expected files in the diff (and nothing else outside `packages/frontend/`):**

- `packages/frontend/src/api/hooks/usePatchFolderAclRole/index.ts` (new)
- `packages/frontend/src/api/hooks/useGetFolders/index.ts` (or similar name)
- `packages/frontend/src/api/hooks/useGetVaults/index.ts` (or similar name)
- `packages/frontend/src/hooks/useFolderPermissions/index.ts` (new, if created)
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx`
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMemberRow/index.tsx`
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/AddMemberSelect/index.tsx`
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/buildAddMembersPayload/index.ts`
- `packages/frontend/src/components/layout/AppShell/useAppShellLayout/index.ts`
- `packages/frontend/src/components/files/AddNewEntity/index.tsx`
- `packages/frontend/src/components/files/FolderListItem/index.tsx`
- `packages/frontend/src/components/files/VaultListItem/index.tsx`
- `packages/frontend/src/components/files/PreviewOverlay/PreviewHeader/index.tsx`
- `packages/frontend/src/components/files/MoveItemModal/index.tsx`
- `packages/frontend/src/components/files/VirtualizedFileTable/index.tsx`
- `packages/frontend/src/pages/HomePage/index.tsx` (or wherever file browser lives)
- i18n translation files
- Possibly new CSS module files if role dropdown needs styling
- Possibly extracted subcomponents if files exceed 120 lines

No files under `packages/backend/` or `packages/shared/` should appear.

---

## Report

When done, summarize:
1. Number of files changed / created
2. How permissions flow from API → component tree (which hook reads it, how it reaches each component)
3. Role dropdown behavior: what options show for admin vs Manager vs regular member
4. Which action buttons are conditional and on which permission flag
5. MoveItemModal: how disabled folders are computed
6. i18n keys added (list them)
7. Any files that needed extraction to stay under 120 lines
8. Build result
9. Any deviations from the plan and why

Then stop — the user reviews before merging.
