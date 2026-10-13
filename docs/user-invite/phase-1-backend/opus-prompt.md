# Phase 1 — Backend: Schema + APIs

You are implementing Phase 1 of the User Invite initiative for the Tayemno monorepo. This phase adds all backend changes: DB schema updates, shared types, member management APIs (invite, list, delete, re-invite), a change-password API, an invite email template, and a modification to the sign-in response. Working from the repo root at `/Users/inaurifam/Desktop/tayemno`.

---

## Read first, in this exact order

1. `docs/user-invite/phase-1-backend/plan.md` — the step-by-step implementation plan. Follow it exactly.
2. `docs/user-invite/README.md` — initiative overview, decisions, verified findings.
3. `.claude/CLAUDE.md` — project conventions. Note: the 120-line file limit applies to frontend only; backend files can be longer.
4. `.claude/encryption-key-hierarchy.md` — key hierarchy and workspace role model.
5. `packages/shared/src/index.ts` — existing shared types (will be modified).
6. `packages/backend/src/db/schema.ts` — existing DB schema (will be modified).
7. `packages/backend/src/config.ts` — existing config (will be modified).
8. `packages/backend/src/repositories/users/index.ts` — existing users repo (will be extended).
9. `packages/backend/src/repositories/workspaceMembers/index.ts` — existing workspace members repo (will be extended).
10. `packages/backend/src/services/email/sendVerificationEmail/index.ts` — email template pattern to copy.
11. `packages/backend/src/services/auth/signInVerify/index.ts` — sign-in verify service (will be modified).
12. `packages/backend/src/routes/auth/index.ts` — auth routes index (will be modified).
13. `packages/backend/src/routes/auth/signInVerify/index.ts` — sign-in verify route (pattern to follow).
14. `packages/backend/src/routes/folders/index.ts` — folder routes (pattern for authenticated routes with `onRequest` hook).
15. `packages/backend/src/index.ts` — server entry (will be modified to register members routes).
16. `packages/backend/src/utils/httpError/index.ts` — HttpError class.
17. `packages/backend/src/services/auth/verifyEmail/index.ts` — verify email service (to understand user creation pattern).

---

## The task

Follow the plan.md steps 1–18 in order. Summary:

1. Update shared types in `packages/shared/src/index.ts`: add `external_member` to `WorkspaceRole`, add `WorkspaceMemberStatus`, add `forcePasswordChange` to `ISignInUserData`, make `encryptedMemberPrivateKey` nullable in `IWorkspaceData` and `WorkspaceMember`, add new request/response interfaces.
2. Update DB schema in `packages/backend/src/db/schema.ts`: add `forcePasswordChange` to `users`, add `status` + `adminEncryptedUserPrivateKey` to `workspace_members`, make `encryptedMemberPrivateKey` nullable.
3. Push schema changes with `npm run db:push -w packages/backend`.
4. Add `FRONTEND_URL` to backend config + `.env` file.
5. Add `findById`, `update`, `deleteById` to users repository.
6. Add `findAllByWorkspaceId`, `findById`, `updateStatusByUserId` to workspace members repository (with `users` table join import).
7. Create `sendInviteEmail` service + update email index export.
8. Create `inviteMember` service.
9. Create `listMembers` service.
10. Create `deleteMember` service.
11. Create `reinviteMember` service.
12. Create members service index.
13. Create `changePassword` auth service + update auth service index.
14. Modify `signInVerify` service to include `forcePasswordChange` in response.
15. Create members route files: index, inviteMember, listMembers, deleteMember, reinviteMember.
16. Create `changePassword` auth route + update auth routes index.
17. Register members routes in server `index.ts`.
18. Verify `verifyEmail` service works with new schema defaults.

---

## Explicitly forbidden in this phase

- **Do NOT touch any frontend files.** No changes to `packages/frontend/` at all.
- **Do NOT implement folder ACL management** for external members (out of scope).
- **Do NOT implement voluntary password change** from settings.
- **Do NOT create middleware abstractions** for role checking — inline the check in each service.
- **Do NOT add audit logging** — mentioned in role descriptions but not implemented.
- **Do NOT modify existing tests** or create new test files unless tests already exist in the project.
- **Do NOT add password complexity validation** on the backend — the frontend handles this.

---

## Hard rules

- Never include `Co-Authored-By` in commit messages.
- Do not commit or push — the user reviews first.
- Do not run destructive git commands.
- Follow existing code patterns exactly (function signatures, error handling with HttpError, repository patterns with Drizzle, route patterns with Fastify generics).
- All new service files go in their own folder: `serviceName/index.ts`.
- All new route files go in their own folder: `routeName/index.ts`.
- Imports use `.js` extension for local schema imports (match existing pattern in repositories: `import { users } from "../../db/schema.js"`).

---

## Verify

After completing all steps:

1. Run `npx tsc --noEmit -p packages/backend/tsconfig.json` — must compile with no errors.
2. Run `npx tsc --noEmit -p packages/shared/tsconfig.json` — must compile with no errors.
3. Check that `npm run db:push -w packages/backend` ran successfully (or `db:generate` + `db:migrate` if using migrations).
4. Run `git diff --stat` — the changed/created files should be:
   - `packages/shared/src/index.ts` (modified)
   - `packages/backend/src/db/schema.ts` (modified)
   - `packages/backend/src/config.ts` (modified)
   - `packages/backend/src/index.ts` (modified)
   - `packages/backend/src/repositories/users/index.ts` (modified)
   - `packages/backend/src/repositories/workspaceMembers/index.ts` (modified)
   - `packages/backend/src/services/auth/index.ts` (modified)
   - `packages/backend/src/services/auth/signInVerify/index.ts` (modified)
   - `packages/backend/src/services/auth/changePassword/index.ts` (new)
   - `packages/backend/src/services/email/index.ts` (modified)
   - `packages/backend/src/services/email/sendInviteEmail/index.ts` (new)
   - `packages/backend/src/services/members/index.ts` (new)
   - `packages/backend/src/services/members/inviteMember/index.ts` (new)
   - `packages/backend/src/services/members/listMembers/index.ts` (new)
   - `packages/backend/src/services/members/deleteMember/index.ts` (new)
   - `packages/backend/src/services/members/reinviteMember/index.ts` (new)
   - `packages/backend/src/routes/auth/index.ts` (modified)
   - `packages/backend/src/routes/auth/changePassword/index.ts` (new)
   - `packages/backend/src/routes/members/index.ts` (new)
   - `packages/backend/src/routes/members/inviteMember/index.ts` (new)
   - `packages/backend/src/routes/members/listMembers/index.ts` (new)
   - `packages/backend/src/routes/members/deleteMember/index.ts` (new)
   - `packages/backend/src/routes/members/reinviteMember/index.ts` (new)
   - `.env` (modified — added FRONTEND_URL)
   - Possibly `packages/backend/drizzle/` migration files if using generate+migrate
5. No files outside the above list should be modified.

---

## Report

When done, summarize:
- Which steps completed successfully
- Any compilation errors encountered and how they were resolved
- The output of `git diff --stat`
- Any concerns or deviations from the plan

Then stop — the user reviews before the next phase.
