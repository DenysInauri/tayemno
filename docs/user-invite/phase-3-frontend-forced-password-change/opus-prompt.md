# Phase 3 — Frontend: Forced Password Change

You are implementing Phase 3 of the User Invite initiative for the Tayemno monorepo. This phase adds the invited user's onboarding experience: after signing in with a temporary password, the user is forced to change their master password before accessing the workspace. The private key (already decrypted in memory from sign-in) is re-encrypted with a new KEK derived from the new password. Working from the repo root at `/Users/inaurifam/Desktop/tayemno`.

---

## Step 0 — Verify prerequisites

Phase 1 (Backend) must be merged. Verify:

1. `packages/shared/src/index.ts` — must contain: `ISignInUserData` has `forcePasswordChange: boolean`, `IChangePasswordRequest` interface exists, `IChangePasswordResponse` interface exists.
2. `packages/backend/src/services/auth/changePassword/index.ts` — must exist.
3. `packages/backend/src/routes/auth/changePassword/index.ts` — must exist.
4. `packages/backend/src/services/auth/signInVerify/index.ts` — must return `forcePasswordChange` in user data.

Phase 2 (Frontend Users Tab) is NOT required for this phase. Phase 2 and 3 can be done in parallel. However, if Phase 2 has already been merged, verify that `RouteEnum` and `EndpointEnum` don't conflict.

If any Phase 1 prerequisites are missing, STOP and report.

---

## Read first, in this exact order

1. `docs/user-invite/phase-3-frontend-forced-password-change/plan.md` — step-by-step plan. Follow it exactly.
2. `docs/user-invite/README.md` — initiative overview, decisions, verified findings.
3. `.claude/CLAUDE.md` — project conventions. **Critical: 120-line limit** on all frontend files.
4. `packages/frontend/src/pages/RegisterPage/buildRegistrationPayload/index.ts` — crypto pattern (SRP + KEK + key encryption). The `buildChangePasswordPayload` is a simplified version of this.
5. `packages/frontend/src/pages/RegisterPage/index.tsx` — page layout pattern (Container + Paper + Stack).
6. `packages/frontend/src/pages/SignInPage/index.tsx` — sign-in page (will be modified).
7. `packages/frontend/src/pages/SignInPage/performSignIn/index.ts` — to understand what data is available after sign-in.
8. `packages/frontend/src/contexts/AuthContext/index.tsx` — auth context (will be modified to add `updateUser`).
9. `packages/frontend/src/components/routing/ProtectedRoute/index.tsx` — route guard (will be modified).
10. `packages/frontend/src/App.tsx` — routing (will be modified).
11. `packages/frontend/src/validations/registerSchema/index.ts` — validation pattern to copy for password rules.
12. `packages/frontend/src/utils/crypto/deriveKey/index.ts` — KDF constants and functions.
13. `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts` — symmetric encryption for re-encrypting private key.
14. `packages/frontend/src/enums/routing/RouteEnum/index.ts` — route enum (will be modified).
15. `packages/frontend/src/enums/api/EndpointEnum/index.ts` — endpoint enum (will be modified).
16. `packages/frontend/src/i18n/locales/en.json` — i18n strings (will be modified).
17. `packages/shared/src/index.ts` — shared types (modified by Phase 1).

---

## The task

Follow plan.md steps 1–10 in order:

1. Add `CHANGE_PASSWORD` to `RouteEnum` and `EndpointEnum`.
2. Add `"changePassword"` i18n strings to `en.json` (title, subtitle, fields, validation, submit button).
3. Create `changePasswordSchema` Yup validation schema (password + confirmPassword with same rules as registration).
4. Create `usePostChangePassword` API hook.
5. Create `buildChangePasswordPayload` crypto function: takes email + new password + decrypted private key → generates new SRP credentials + new KEK → re-encrypts private key → returns `IChangePasswordRequest`.
6. Create `ChangePasswordPage` component: standalone page (no AppShell), form with new password + confirm, loading state during Argon2id, calls API, updates auth state, navigates HOME.
7. Modify `AuthContext` to add `updateUser` method that merges partial user data into state.
8. Modify `ProtectedRoute` to redirect authenticated users with `forcePasswordChange === true` to `/change-password` (except when already on that route).
9. Modify `SignInPage` onSubmit to check `result.user.forcePasswordChange` — if true, navigate to CHANGE_PASSWORD instead of HOME.
10. Add `ChangePasswordPage` route in `App.tsx` — inside `ProtectedRoute` but outside `AppShellLayout`.

---

## Explicitly forbidden in this phase

- **Do NOT build voluntary password change** from Settings — this is only the forced-change flow.
- **Do NOT add an old password field** — the private key is already decrypted in memory from the sign-in step.
- **Do NOT touch the Users tab** or member management UI — that is Phase 2.
- **Do NOT touch backend files** — all backend changes were in Phase 1.
- **Do NOT add password strength meter** — the validation schema handles requirements.
- **Do NOT add mobile-specific styles** — desktop only.
- **Do NOT modify the sign-in crypto flow** (`performSignIn`) — only modify the navigation logic in `SignInPage.onSubmit`.

---

## Hard rules

- Never include `Co-Authored-By` in commit messages.
- Do not commit or push — the user reviews first.
- Do not run destructive git commands.
- **All frontend files must stay under 120 lines (150 max).** Extract logic into separate files using `functionName/index.ts` pattern if needed.
- Use arrow function components.
- Use `interface` for props — prefix with `I`.
- Use `useTranslation()` for all user-visible strings.
- Validation schemas use i18n keys as error messages.
- Follow existing UI patterns: Container + Paper + Stack for standalone pages, Formik + Yup for form state.
- Import UI wrappers from `../../components/ui/` — check which exist (Button, Container, Paper, Stack, Title, Text, PasswordInput are all available based on existing RegisterPage/SignInPage imports).

---

## Verify

After completing all steps:

1. Run `npx tsc --noEmit -p packages/frontend/tsconfig.json` — must compile with no errors.
2. Run `npm run build -w packages/frontend` — must build successfully.
3. Verify no new file exceeds 120 lines: `wc -l packages/frontend/src/pages/ChangePasswordPage/index.tsx packages/frontend/src/pages/ChangePasswordPage/buildChangePasswordPayload/index.ts packages/frontend/src/validations/changePasswordSchema/index.ts packages/frontend/src/api/hooks/usePostChangePassword/index.ts`
4. Run `git diff --stat` — changed/created files should include:
   - `packages/frontend/src/enums/routing/RouteEnum/index.ts` (modified)
   - `packages/frontend/src/enums/api/EndpointEnum/index.ts` (modified)
   - `packages/frontend/src/i18n/locales/en.json` (modified)
   - `packages/frontend/src/contexts/AuthContext/index.tsx` (modified)
   - `packages/frontend/src/components/routing/ProtectedRoute/index.tsx` (modified)
   - `packages/frontend/src/pages/SignInPage/index.tsx` (modified)
   - `packages/frontend/src/App.tsx` (modified)
   - `packages/frontend/src/pages/ChangePasswordPage/index.tsx` (new)
   - `packages/frontend/src/pages/ChangePasswordPage/buildChangePasswordPayload/index.ts` (new)
   - `packages/frontend/src/validations/changePasswordSchema/index.ts` (new)
   - `packages/frontend/src/api/hooks/usePostChangePassword/index.ts` (new)
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
