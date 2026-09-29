# Phase 2 — StreamCrypto + Frontend Upload

You are executing **Phase 2** of the **File Upload** initiative for the Tayemno monorepo. The repo root is at the current working directory. This phase adds the `StreamCrypto` class for chunked file encryption, two API mutation hooks, and a functional `UploadFileModal` that encrypts a file and uploads it to R2 via a presigned URL.

## Step 0 — Verify prerequisites

Phase 1 must be completed. Verify:

1. `packages/shared/src/index.ts` contains these interfaces: `IPresignVaultRequest`, `IPresignVaultResponse`, `ICreateVaultRequest`, `ICreateVaultResponse`.
2. `packages/shared/src/index.ts` — the `Vault` interface does NOT have an `encryptedName` field.
3. `packages/backend/src/routes/vaults/index.ts` exists and exports `vaultsRoutes`.
4. `packages/backend/src/index.ts` registers vault routes: `app.register(vaultsRoutes, { prefix: "/vaults" })`.
5. Run `npx tsc --build` in `packages/backend` — must compile with zero errors.

If any of these are wrong, STOP and report what you found — Phase 1 was not completed properly.

## Read first — in this exact order

1. `docs/file-upload/phase-2-stream-crypto-upload/plan.md` — the detailed plan you will follow.
2. `docs/file-upload/README.md` — initiative overview, decisions, verified findings, key hierarchy.
3. `.claude/frontend/api-guide.md` — two-layer hook pattern, enum usage, `select` + fallback.
4. `.claude/frontend/code-style.md` — arrow functions, interface naming, form patterns, validation schemas, i18n.
5. These existing sibling files whose patterns you must imitate:
   - `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts` — crypto class pattern (static class, `await sodium.ready`, hex keys, base64 output).
   - `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts` — another crypto class for reference.
   - `packages/frontend/src/api/hooks/usePostCreateFolder/index.ts` — mutation hook pattern (for presign + create vault hooks).
   - `packages/frontend/src/components/files/CreateFolderModal/index.tsx` — modal form pattern (Formik, validation, i18n, onSubmit).
   - `packages/frontend/src/components/files/AddNewEntity/index.tsx` — where UploadFileModal is rendered, E2EE flow in `handleCreateFolder`.
   - `packages/frontend/src/api/hooks/useGetFolders/index.ts` — for accessing folder data (folders with symmetricKey).
   - `packages/frontend/src/contexts/AuthContext/index.tsx` — `useAuth()` provides `user`, `keyPair`.
   - `packages/frontend/src/validations/createFolderSchema/index.ts` — Yup validation schema pattern.
   - `packages/frontend/src/pages/HomePage/index.tsx` — current page structure, vault rendering.

## The task

Follow the plan in `docs/file-upload/phase-2-stream-crypto-upload/plan.md` exactly. The steps are numbered 1–10. Execute them in order:

1. Create `StreamCrypto` class at `packages/frontend/src/utils/crypto/StreamCrypto/index.ts` — uses `crypto_secretstream_xchacha20poly1305` from `libsodium-wrappers-sumo`, 64KB chunks, returns `{ header: string, encryptedBlob: Blob }`.
2. Add `VAULTS_PRESIGN` and `VAULTS` to `EndpointEnum`. Add `VAULTS` to `QueryKeyEnum`.
3. Create `usePostPresignVault` hook — no query invalidation.
4. Create `usePostCreateVault` hook — invalidates `QueryKeyEnum.VAULTS` on success.
5. **Decision point for `useGetVaults` hook** — the plan offers Option A (skip, keep hardcoded empty array) vs Option B (add GET endpoint). Ask the user which to pick. Do NOT guess.
6. Replace `UploadFileModal` placeholder with a functional form: `FileInput` for file selection, submit button, Formik form state.
7. Implement the full upload flow in `UploadFileModal` on form submit: decrypt folder key → generate vault key → encrypt file with StreamCrypto → encrypt vault key with folder key → presign URL → PUT to R2 → create vault record.
8. Update `AddNewEntity` to pass `folderId` to `UploadFileModal`, conditionally render upload menu item and modal only when `folderId` is not null.
9. Add i18n keys for the upload modal (find existing locale files, add `files.uploadFile.*` keys).
10. Add Yup validation schema for the upload form.

### Critical implementation details

- **Key hierarchy:** Folder key (from folderKeyShares, decrypted with user's private key via `AsymmetricCrypto.decrypt`) → Vault key (new, generated with `SymmetricCrypto.generateKey()`, encrypted with folder key via `SymmetricCrypto.encrypt`) → File content (encrypted with vault key via `StreamCrypto.encryptFile`).
- **`vaults.symmetricKey`** stores `JSON.stringify({ nonce, ciphertext })` — the vault key encrypted with the folder's symmetric key.
- **`vaults.contentNonce`** stores the secretstream header (base64 string from `StreamCrypto`).
- **`sizeBytes`** in `ICreateVaultRequest` is the encrypted blob size, not the original file size.
- **R2 upload** uses raw `fetch()` with PUT method — NOT the Axios instance (no auth header needed, presigned URL handles auth).
- **`keyPair`** comes from `useAuth()` context. `folders` data comes from `useGetFolders()`.
- `UploadFileModal` needs both `usePostPresignVault` and `usePostCreateVault` hooks, plus access to `useAuth` and `useGetFolders`.

## Explicitly forbidden in this phase

- **No backend changes.** Do not touch anything in `packages/backend/`.
- **No file download or decryption.** Do not add `StreamCrypto.decryptFile()` — out of scope.
- **No drag-and-drop upload.** Use standard file input only.
- **No progress bar.** Out of scope for this phase.
- **No multipart upload logic.** Single PUT to presigned URL.
- **No new wrapper components** in `components/ui/` unless absolutely necessary (prefer direct Mantine imports for one-off uses like `FileInput`).
- **No changes to `packages/shared/`** — all needed interfaces were added in Phase 1.
- **No `GET /vaults` endpoint** unless the user explicitly picks Option B in step 5.

## Hard rules

- **Arrow functions only** — no `function` keyword.
- **Interface naming** — prefix with `I` for interfaces.
- **Enum usage** — never hardcode endpoint paths or query keys as strings. Always use `EndpointEnum` and `QueryKeyEnum`.
- **One hook per endpoint** — each hook in its own folder (`api/hooks/usePostX/index.ts`).
- **Formik + Yup** for form state and validation.
- **i18n keys as error messages** in Yup schemas — never hardcode error strings.
- **`select` + fallback** pattern for any GET hooks (not applicable here since we're only adding POST hooks, but keep in mind).
- **Do not commit or push.** Leave changes for review.
- **Do not run destructive git commands.**
- **Do not modify `.claude/` directory** contents.

## Verify

After completing all steps, run:

```bash
# 1. TypeScript build — must produce no errors
cd packages/frontend && npx tsc --noEmit

# 2. Vite dev build — must succeed
cd packages/frontend && npx vite build

# 3. Scope check
git diff --name-only
```

Expected files in the diff:

- `packages/frontend/src/utils/crypto/StreamCrypto/index.ts` (new)
- `packages/frontend/src/enums/api/EndpointEnum/index.ts` (modified)
- `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` (modified)
- `packages/frontend/src/api/hooks/usePostPresignVault/index.ts` (new)
- `packages/frontend/src/api/hooks/usePostCreateVault/index.ts` (new)
- `packages/frontend/src/components/files/UploadFileModal/index.tsx` (modified)
- `packages/frontend/src/components/files/AddNewEntity/index.tsx` (modified)
- `packages/frontend/src/validations/uploadFileSchema/index.ts` (new)
- i18n locale file(s) (modified — find which ones by checking existing `files.createFolder` keys)

If anything outside this list appears, investigate and undo unintended changes.

## Report

When done, summarize:

1. Which steps completed successfully.
2. The `tsc --noEmit` output (confirm zero errors).
3. The `vite build` output (confirm success).
4. The `git diff --name-only` output.
5. Which option the user picked for step 5 (useGetVaults).
6. Any issues encountered and how you resolved them.

Then stop — the user reviews before the next phase.
