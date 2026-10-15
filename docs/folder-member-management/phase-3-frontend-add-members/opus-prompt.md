# Phase 3: Frontend — Add Members to Folder with Crypto

You are implementing Phase 3 of the "Folder Member Management" initiative in a monorepo at the repo root. This phase adds the "add member" flow: a MultiSelect picker for workspace members, E2EE folder key encryption per user, and a bulk POST to grant folder access.

## Step 0 — Verify prerequisites

Phase 1 and Phase 2 must be merged. Verify these exist:

**From Phase 1:**
- `packages/shared/src/index.ts` — must contain `IBulkCreateFolderAclRequest`, `IBulkCreateFolderAclResponse`, and `publicKey` field in `IMemberItem`
- `packages/backend/src/routes/folders/bulkCreateFolderAcl/index.ts` — the bulk ACL route

**From Phase 2:**
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx` — the folder members section
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMembersList/index.tsx` — the virtualized list
- `packages/frontend/src/api/hooks/useGetFolderMembers/index.ts` — the folder members query hook
- `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` — must contain `FOLDER_MEMBERS`

If any are missing, STOP and report.

## Read first, in this exact order

1. `docs/folder-member-management/phase-3-frontend-add-members/plan.md` — the detailed plan
2. `docs/folder-member-management/README.md` — overall context, decisions, and crypto flow description
3. `.claude/frontend/code-style.md` — code conventions
4. `.claude/frontend/ui-guide.md` — wrapper component patterns
5. `.claude/encryption-key-hierarchy.md` — full encryption model
6. `packages/frontend/src/api/hooks/useGetFolderKeyAsMember/index.ts` — the existing folder key hook (pattern to extend with admin fallback)
7. `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts` — verify `encrypt(plaintext, publicKey)` and `decrypt(ciphertext, publicKey, privateKey)` signatures
8. `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts` — verify `decrypt({ciphertext, nonce}, key)` signature
9. `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx` — the component to modify (add the "add member" button and handler)
10. `packages/frontend/src/api/hooks/useGetMembers/index.ts` — fetches workspace members (source of users to add)
11. `packages/frontend/src/api/hooks/usePostInviteMember/index.ts` — sibling mutation hook pattern to copy
12. `packages/frontend/src/components/files/AddNewEntity/buildCreateFolderPayload/index.ts` — sibling crypto payload builder pattern
13. `packages/frontend/src/contexts/AuthContext/index.tsx` — verify `workspace.encryptedAdminPrivateKey`, `workspace.adminPublicKey`, `keyPair` shape
14. `packages/shared/src/index.ts` — verify `IBulkCreateFolderAclRequest` and `IMemberItem.publicKey`

## The task

Follow the plan exactly. The steps are:

1. Create `useGetFolderKey` hook at `packages/frontend/src/api/hooks/useGetFolderKey/index.ts` — extends `useGetFolderKeyAsMember` pattern with admin fallback path (decrypt `folder.encryptedSymmetricKey` via workspace admin key pair). **Verify crypto function signatures before coding.**
2. Create `usePostBulkFolderAcl` hook at `packages/frontend/src/api/hooks/usePostBulkFolderAcl/index.ts`
3. Create `buildAddMembersPayload` utility at `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/buildAddMembersPayload/index.ts`
4. Create `AddMemberSelect` component at `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/AddMemberSelect/index.tsx` — uses Mantine `MultiSelect` with workspace members, disabled items for already-added members
5. Modify `FolderMembersSection` — add "Add member" button, toggle `AddMemberSelect` visibility, wire up the crypto + bulk POST flow
6. Add i18n keys under `aside.members.add` in `packages/frontend/src/i18n/locales/en.json`

## Explicitly forbidden in this phase

- Do NOT touch backend files (`packages/backend/`)
- Do NOT modify the virtualized member list (`FolderMembersList`, `FolderMemberRow`) — those are Phase 2 and done
- Do NOT modify `AsideContent/index.tsx` — the member section composition is already wired from Phase 2
- Do NOT modify `AppShell/index.tsx` or `useAppShellLayout`
- Do NOT add confirmation modals or toast notifications
- Do NOT add mobile-specific styles
- Do NOT modify `useGetFolderKeyAsMember` — create a new hook `useGetFolderKey` instead

## Hard rules

- All files under 120 lines (150 max). If `FolderMembersSection` exceeds 120 lines, extract the add-member handler into `useAddFolderMembers/index.ts`
- Arrow functions only
- Interfaces prefixed with `I`
- `SizeEnum` for all numeric spacing values
- `ComponentName/index.tsx` folder convention
- Verify crypto function signatures by reading the source before using them — do not assume
- Do NOT commit or push
- Do NOT run destructive git commands

## Verify

```bash
npm run build -w packages/frontend
```

Run a git diff scope check. The diff should touch ONLY:

- `packages/frontend/src/api/hooks/useGetFolderKey/index.ts` (new)
- `packages/frontend/src/api/hooks/usePostBulkFolderAcl/index.ts` (new)
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx` (modified)
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/buildAddMembersPayload/index.ts` (new)
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/AddMemberSelect/index.tsx` (new)
- `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/useAddFolderMembers/index.ts` (new, only if FolderMembersSection exceeded 120 lines)
- `packages/frontend/src/i18n/locales/en.json`

Nothing else should appear in the diff.

## Report

When done, summarize:
1. Which files were created and modified
2. The `npm run build` result
3. The `git diff --stat` output
4. How `useGetFolderKey` was implemented (which crypto paths are used)
5. Whether `FolderMembersSection` stayed under 120 lines or required extraction
6. Any issues encountered

Then stop — the user reviews before the next phase.
