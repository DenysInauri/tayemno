# User Invite Initiative

Add user invitation to workspaces: admins/owners can invite new users with a temporary master password, manage members (list, search, delete, re-invite), and invited users complete onboarding by changing their temporary password on first login. Uses Option 3 from the spec — admin creates the user fully (including temporary master password and all crypto keys), and the invited user is forced to change the password after first sign-in. A new `external_member` role is introduced with no access to workspace-level keys.

## Decisions

1. **Users tab placement** — Top-level nav item in sidebar (alongside Files, Settings), at route `/users`. Approved.
2. **Invited user status tracking** — Explicit `status` column on `workspace_members` table (`'invited'` | `'active'`), not derived from `forcePasswordChange`. Approved.
3. **`forcePasswordChange` column** — On `users` table (user-level), not per-workspace. Approved.
4. **Invite email link** — Link to `${FRONTEND_URL}/sign-in?email=${encodedEmail}` so email field auto-fills. Email body includes workspace name, email, temp password, forced-change notice. Approved.
5. **Change password scope** — Forced-change only (no old password field). Voluntary password change from Settings is a separate initiative. Approved.
6. **Workspace name in invite request** — FE sends decrypted workspace name in the invite request body for the email template. Approved.

## Verified Findings

These are the facts the plan relies on. Each executing session should re-verify the file/line references before starting.

| # | Finding | File | Why it matters |
|---|---------|------|---------------|
| 1 | `WorkspaceRole = "owner" \| "admin" \| "member"` — no `external_member` yet | `packages/shared/src/index.ts:39` | Must add `"external_member"` to the union |
| 2 | `encryptedMemberPrivateKey` is `.notNull()` in schema | `packages/backend/src/db/schema.ts:108` | Must become nullable for `external_member` (they get no workspace keys) |
| 3 | Registration crypto: SRP + Argon2id KEK + user keypair + workspace keypairs sealed-box | `packages/frontend/src/pages/RegisterPage/buildRegistrationPayload/index.ts:19-86` | Invite crypto payload mirrors this pattern but reuses existing workspace |
| 4 | `ISignInUserData` has no `forcePasswordChange` field | `packages/shared/src/index.ts:231-243` | Must add it; returned in sign-in verify response |
| 5 | `signInVerify` service builds response manually from user + membership + workspace records | `packages/backend/src/services/auth/signInVerify/index.ts:62-86` | Add `forcePasswordChange: user.forcePasswordChange` to the user object in response |
| 6 | Sign-in route generates JWT with `{ sub: user.id }` | `packages/backend/src/routes/auth/signInVerify/index.ts:12-13` | Change-password route uses same JWT; userId comes from `request.user.sub` |
| 7 | `performSignIn` returns decrypted `keyPair` + `user` + `workspace` + `token` | `packages/frontend/src/pages/SignInPage/performSignIn/index.ts:78-83` | Private key is already in memory when forced-change screen appears — no need for old password |
| 8 | AppShell nav: Files + Settings + Sign out, no role checks | `packages/frontend/src/components/layout/AppShell/index.tsx:18-33` | Users nav item needs conditional visibility via `workspace.role` from `useAuth()` |
| 9 | Auth context stores `workspace.role` as `WorkspaceRole` | `packages/frontend/src/contexts/AuthContext/index.tsx:34` | Available for role-based rendering |
| 10 | Backend has no member management routes or services | `packages/backend/src/routes/` and `packages/backend/src/services/` | All member CRUD is new |
| 11 | Users repo has `findByEmail` + `create` — no `update`, `deleteById`, or `findById` | `packages/backend/src/repositories/users/index.ts:1-19` | Must add these methods |
| 12 | WorkspaceMembers repo has `create`, `findByUserId`, `findByWorkspaceIdAndUserId` — no `findAll`, `findById`, `deleteByUserId` | `packages/backend/src/repositories/workspaceMembers/index.ts:1-39` | Must add these methods |
| 13 | Email service pattern: nodemailer with HTML template, logs preview URL for test accounts | `packages/backend/src/services/email/sendVerificationEmail/index.ts:1-29` | Invite email follows same pattern |
| 14 | Backend config has SMTP settings but no `FRONTEND_URL` | `packages/backend/src/config.ts:19-23` | Must add `FRONTEND_URL` to config schema and type |
| 15 | Auth routes are public (no `authenticate` hook); folders/vaults routes use `app.addHook("onRequest", authenticate)` | `packages/backend/src/routes/auth/index.ts` vs `packages/backend/src/routes/folders/index.ts:14` | Members routes need authenticate hook; change-password route needs authenticate hook |
| 16 | Drizzle migration: `db:push` for schema push, `db:generate` + `db:migrate` for SQL migrations; config outputs to `./drizzle` | `packages/backend/package.json:10-12`, `packages/backend/drizzle.config.ts` | Use `db:push` for development |
| 17 | `ProtectedRoute` checks `isAuthenticated` only — no role or forcePasswordChange checks | `packages/frontend/src/components/routing/ProtectedRoute/index.tsx` | Must add forcePasswordChange redirect logic |
| 18 | Sign-in page navigates to `RouteEnum.HOME` on success at line 60 | `packages/frontend/src/pages/SignInPage/index.tsx:60` | Must check `forcePasswordChange` and navigate to CHANGE_PASSWORD instead |
| 19 | `IWorkspaceData.encryptedMemberPrivateKey: string` (non-nullable) | `packages/shared/src/index.ts:188` | Must become `string \| null` for external_member |
| 20 | Frontend files must stay under 120 lines (150 max) | `.claude/CLAUDE.md` | All new FE components must follow this limit |

## Behavioral Changes

1. **New nav item**: Admin/owner users see a "Users" item in the sidebar navigation between Files and Settings.
2. **Users page**: Shows a searchable table of all workspace members with their name, email, role, and status (Active/Invited).
3. **Invite flow**: Admin clicks "Invite User" → fills email, name, selects role → system generates temp password and all crypto keys → BE creates user + workspace membership → invite email sent with temp password.
4. **Invited user sign-in**: User signs in with temp password → immediately redirected to "Change Password" screen → enters new master password → private key re-encrypted with new KEK → status becomes Active.
5. **Re-invite**: Admin can re-send invite email for users with "Invited" status. This generates a new temp password and re-encrypts the user's private key (decrypted from admin backup).
6. **Delete member**: Admin can delete non-owner, non-self members. Deletes the user record (cascades to workspace_members, folder_acls).
7. **New role**: `external_member` has no workspace-level keys — cannot access standalone vaults or folders. Access to folders only via explicit ACL grants (folder ACL management is out of scope for this initiative).
8. **Sign-in response**: Now includes `forcePasswordChange` boolean in user data.
9. **`encryptedMemberPrivateKey`** becomes nullable in types and schema (for external_member support).
10. **ProtectedRoute**: Redirects to `/change-password` when `forcePasswordChange` is true.

## Phase Table

| Phase | Name | Plan | Depends On |
|-------|------|------|------------|
| 1 | Backend: Schema + APIs | [phase-1-backend/plan.md](phase-1-backend/plan.md) | — |
| 2 | Frontend: Users Tab + Invite | [phase-2-frontend-users-tab/plan.md](phase-2-frontend-users-tab/plan.md) | Phase 1 |
| 3 | Frontend: Forced Password Change | [phase-3-frontend-forced-password-change/plan.md](phase-3-frontend-forced-password-change/plan.md) | Phase 1 |

Phases 2 and 3 can be developed in parallel once Phase 1 is merged.

## Out of Scope

1. **Adding members to folders** — explicitly excluded by spec.
2. **Voluntary password change** from Settings (non-forced).
3. **Admin-assisted password recovery** — the admin backup key enables this, but the recovery UI/flow is not built.
4. **Multi-workspace membership** — spec says "don't add user who is already a member of another workspace."
5. **Owner transfer** or role changes after creation.
6. **Audit logs** — mentioned in role descriptions but not implemented.
7. **Key rotation on member deletion** — deleting the `workspace_members` row removes encrypted key copies; no workspace key rotation is performed.
8. **Member profile editing** by admin after invite.
