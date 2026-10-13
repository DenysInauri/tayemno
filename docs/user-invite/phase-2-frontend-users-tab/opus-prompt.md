# Phase 2 — Frontend: Users Tab + Invite

You are implementing Phase 2 of the User Invite initiative for the Tayemno monorepo. This phase adds the admin-facing UI: a "Users" nav item (visible to admin/owner only), a UsersPage with a searchable members table, an Invite User modal with crypto key generation, delete member confirmation, and re-invite capability. Working from the repo root at `/Users/inaurifam/Desktop/tayemno`.

---

## Step 0 — Verify prerequisites

Phase 1 (Backend) must be merged. Verify these files exist and contain the expected changes:

1. `packages/shared/src/index.ts` — must contain: `WorkspaceRole` includes `"external_member"`, `WorkspaceMemberStatus` type exists, `ISignInUserData` has `forcePasswordChange`, `IMemberItem` interface exists, `IInviteMemberRequest`, `IInviteMemberResponse`, `IListMembersResponse`, `IDeleteMemberResponse`, `IReinviteMemberRequest`, `IReinviteMemberResponse` interfaces exist.
2. `packages/backend/src/routes/members/index.ts` — must exist (members routes registered).
3. `packages/backend/src/services/members/index.ts` — must export `inviteMember`, `listMembers`, `deleteMember`, `reinviteMember`.
4. `packages/backend/src/services/auth/changePassword/index.ts` — must exist.

If ANY of these are missing, STOP and report. Do not improvise the backend.

---

## Read first, in this exact order

1. `docs/user-invite/phase-2-frontend-users-tab/plan.md` — step-by-step plan. Follow it exactly.
2. `docs/user-invite/README.md` — initiative overview, decisions, verified findings.
3. `.claude/CLAUDE.md` — project conventions. **Critical: 120-line limit** on all frontend files.
4. `packages/frontend/src/pages/RegisterPage/buildRegistrationPayload/index.ts` — crypto pattern to imitate for `buildInvitePayload`.
5. `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts` — sealed box encrypt/decrypt API.
6. `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts` — symmetric encrypt API.
7. `packages/frontend/src/utils/crypto/deriveKey/index.ts` — KDF constants and `deriveKey`/`generateSalt` functions.
8. `packages/frontend/src/components/layout/AppShell/index.tsx` — nav structure (will be modified).
9. `packages/frontend/src/App.tsx` — routing (will be modified).
10. `packages/frontend/src/pages/SignInPage/index.tsx` — sign-in page (will be modified for email pre-fill).
11. `packages/frontend/src/components/files/MoveItemModal/index.tsx` — modal component pattern.
12. `packages/frontend/src/validations/registerSchema/index.ts` — Yup validation pattern.
13. `packages/frontend/src/api/hooks/usePostCreateFolder/index.ts` — mutation hook with cache invalidation pattern.
14. `packages/frontend/src/api/hooks/useApiPost/index.ts` — generic POST hook.
15. `packages/frontend/src/api/hooks/useApiDelete/index.ts` — generic DELETE hook.
16. `packages/frontend/src/i18n/locales/en.json` — existing i18n structure.
17. `packages/frontend/src/enums/routing/RouteEnum/index.ts` — route enum (will be modified).
18. `packages/frontend/src/enums/api/EndpointEnum/index.ts` — endpoint enum (will be modified).
19. `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` — query key enum (will be modified).
20. `packages/frontend/src/contexts/AuthContext/index.tsx` — auth context (`useAuth` hook, workspace role).
21. `packages/shared/src/index.ts` — shared types (modified by Phase 1).

---

## The task

Follow plan.md steps 1–17 in order:

1. Add `USERS` to `RouteEnum`, `MEMBERS` to `EndpointEnum`, `MEMBERS` to `QueryKeyEnum`.
2. Create `RoleWrapper` component at `components/routing/RoleWrapper/index.tsx` — reads `workspace.role` from `useAuth()`, renders children only if role is in `allowedFor` array.
3. Add Users `NavLink` to AppShell wrapped in `<RoleWrapper allowedFor={["owner", "admin"]}>`. Import `IconUsers` and `RoleWrapper`.
4. Add `UsersPage` route in `App.tsx` inside the `AppShellLayout` group.
5. Add all `"users"` i18n strings to `en.json` (including nav, columns, status, roles, invite, delete sections).
6. Create API hooks: `useGetMembers`, `usePostInviteMember`, `useDeleteMember`, `usePostReinviteMember`.
7. Create `inviteUserSchema` Yup validation schema.
8. Create `generateTempPassword` utility.
9. Create `buildInvitePayload` crypto function (mirrors `buildRegistrationPayload` but for existing workspace).
10. Create `buildReinvitePayload` crypto function (decrypts user private key from admin backup, re-encrypts with new KEK).
11. Create `InviteUserModal` with Formik form (email, name, role picker).
12. Create `RolePicker` component (Mantine Select with role descriptions).
13. Create `UsersTable` component (Mantine Table with status badges and action buttons).
14. Create `DeleteMemberModal` confirmation dialog.
15. Create `UsersPage` composing all pieces: title, search, invite button, table, modals. Decrypt workspace name for invite/reinvite payloads.
16. Wire up workspace name decryption in UsersPage (or extracted hook if needed to stay under 120 lines).
17. Add email pre-fill from query param on SignInPage.

---

## Explicitly forbidden in this phase

- **Do NOT create or modify `ChangePasswordPage`** — that is Phase 3.
- **Do NOT modify `ProtectedRoute`** — that is Phase 3.
- **Do NOT modify `performSignIn`** — that is Phase 3.
- **Do NOT add folder ACL management** — out of scope.
- **Do NOT add mobile-specific styles** — desktop only.
- **Do NOT touch backend files** — all backend changes were in Phase 1.
- **Do NOT add pagination or server-side sorting** — client-side filtering is sufficient for workspace member lists.

---

## Hard rules

- Never include `Co-Authored-By` in commit messages.
- Do not commit or push — the user reviews first.
- Do not run destructive git commands.
- **All frontend files must stay under 120 lines (150 max).** When a file grows beyond this, extract logic into separate files using the `functionName/index.ts` folder convention.
- Use arrow function components (not `function` keyword).
- Use `interface` (not `type`) for component props — prefix with `I`.
- Use `useTranslation()` for all user-visible strings — never hardcode text.
- Validation schemas use i18n keys as error messages.
- Follow the two-layer API hook pattern: generic hooks → domain hooks.
- UI wrapper components (Button, TextInput, etc.) are imported from `../../components/ui/` — check which exist before importing from Mantine directly.

---

## Verify

After completing all steps:

1. Run `npx tsc --noEmit -p packages/frontend/tsconfig.json` — must compile with no errors.
2. Run `npm run build -w packages/frontend` — must build successfully.
3. Verify no file exceeds 120 lines: `find packages/frontend/src/pages/UsersPage -name "*.ts" -o -name "*.tsx" | xargs wc -l` — all under 120 (150 max).
4. Run `git diff --stat` — changed/created files should include:
   - `packages/frontend/src/enums/routing/RouteEnum/index.ts` (modified)
   - `packages/frontend/src/enums/api/EndpointEnum/index.ts` (modified)
   - `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` (modified)
   - `packages/frontend/src/components/layout/AppShell/index.tsx` (modified)
   - `packages/frontend/src/App.tsx` (modified)
   - `packages/frontend/src/pages/SignInPage/index.tsx` (modified)
   - `packages/frontend/src/i18n/locales/en.json` (modified)
   - `packages/frontend/src/components/routing/RoleWrapper/index.tsx` (new)
   - `packages/frontend/src/pages/UsersPage/index.tsx` (new)
   - `packages/frontend/src/pages/UsersPage/UsersTable/index.tsx` (new)
   - `packages/frontend/src/pages/UsersPage/InviteUserModal/index.tsx` (new)
   - `packages/frontend/src/pages/UsersPage/InviteUserModal/RolePicker/index.tsx` (new)
   - `packages/frontend/src/pages/UsersPage/InviteUserModal/buildInvitePayload/index.ts` (new)
   - `packages/frontend/src/utils/generateTempPassword/index.ts` (new)
   - `packages/frontend/src/pages/UsersPage/DeleteMemberModal/index.tsx` (new)
   - `packages/frontend/src/pages/UsersPage/buildReinvitePayload/index.ts` (new)
   - `packages/frontend/src/api/hooks/useGetMembers/index.ts` (new)
   - `packages/frontend/src/api/hooks/usePostInviteMember/index.ts` (new)
   - `packages/frontend/src/api/hooks/useDeleteMember/index.ts` (new)
   - `packages/frontend/src/api/hooks/usePostReinviteMember/index.ts` (new)
   - `packages/frontend/src/validations/inviteUserSchema/index.ts` (new)
5. No backend files or files outside the above list should be modified.

---

## Report

When done, summarize:
- Which steps completed successfully
- Any compilation errors encountered and how they were resolved
- Line counts for new files (to confirm 120-line compliance)
- The output of `git diff --stat`
- Any concerns or deviations from the plan

Then stop — the user reviews before the next phase.
