# File Upload (E2EE, Cloudflare R2)

Add encrypted file upload to folders. Files are encrypted client-side with libsodium's secretstream API, uploaded directly to Cloudflare R2 via presigned URLs, and metadata is saved to the backend. The backend never sees plaintext content (zero-knowledge).

## Decisions

1. **Bucket provider: Cloudflare R2** — S3-compatible API (uses `@aws-sdk/client-s3`), zero egress cost, generous free tier. Approved.
2. **Upload approach: Presigned PUT URL** — backend generates a signed URL, frontend uploads the encrypted blob directly to R2. No double transfer. Approved.
3. **Chunked encryption: new `StreamCrypto` class** — uses `crypto_secretstream_xchacha20poly1305` from libsodium-wrappers-sumo. Fixed 64KB input chunks. Approved.
4. **`encryptedName` removed** — `vaults.name` is plaintext. The `encryptedName` column and field are removed from schema and shared types. Approved.

## Verified Findings

These are the facts the plan relies on. Each executing session should re-verify them before starting.

### Schema

- `vaults` table: `packages/backend/src/db/schema.ts:117-144`. Fields: `id`, `ownerId`, `folderId`, `name`, `mimeType`, `extension`, `sizeBytes`, `s3Key`, `contentNonce`, `encryptedName` (to remove), `symmetricKey`, timestamps.
- `vaultKeyShares` table: same file `:146-166`. Fields: `id`, `vaultId`, `userId`, `symmetricKey`, timestamps. Unique on `(vaultId, userId)`.
- Shared types: `packages/shared/src/index.ts:69-111`. `Vault`, `NewVault`, `VaultKeyShare`, `NewVaultKeyShare` — all have `encryptedName` (to remove).

### Backend

- Config: `packages/backend/src/config.ts`. Uses `@fastify/env` with JSON schema. Loads `.env` from monorepo root. No S3 vars exist yet.
- App bootstrap: `packages/backend/src/index.ts`. Registers routes with `app.register(routes, { prefix })`. Decorates `app.db` and `app.mailTransport`.
- FastifyInstance augmentation: same file `:16-21`. Declares `db` and `mailTransport` on the instance.
- JWT type: same file `:23-28`. `request.user.sub` is the user ID.
- Auth middleware: `packages/backend/src/utils/authenticate/index.ts`. Calls `request.jwtVerify()`.
- Route pattern: `packages/backend/src/routes/folders/` — domain `index.ts` adds `onRequest` auth hook, registers sub-route plugins.
- Service pattern: `packages/backend/src/services/folders/createFolder/index.ts`. Arrow function, `db: Database` first param, returns typed response, uses `mapFolder` for Date→string.
- Repository pattern: `packages/backend/src/repositories/folders/index.ts`. Arrow functions, `db: Database` first param, Drizzle queries, imports schema with `.js` extension.
- No S3 SDK in backend `package.json`.

### Frontend

- `SymmetricCrypto`: `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts`. Uses `crypto_aead_xchacha20poly1305_ietf`. Encrypt/decrypt entire payloads in memory. Returns `{ nonce: string, ciphertext: string }` (both base64). Keys are hex strings.
- `AsymmetricCrypto`: `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts`. Uses `crypto_box_seal`. Encrypt returns single base64 string.
- `libsodium-wrappers-sumo` `^0.8.4` installed — includes `crypto_secretstream_xchacha20poly1305` API.
- `UploadFileModal`: `packages/frontend/src/components/files/UploadFileModal/index.tsx`. Placeholder only.
- `AddNewEntity`: `packages/frontend/src/components/files/AddNewEntity/index.tsx`. Renders upload modal, receives `folderId` prop (null on root, string inside folder).
- API hooks pattern: `packages/frontend/src/api/hooks/usePostCreateFolder/index.ts`. Uses `useApiPost`, invalidates query on success.
- Axios config: `packages/frontend/src/api/axios/index.ts`. `baseURL` from env, auto-attaches Bearer token.
- No S3 SDK in frontend `package.json`.

### Key Hierarchy (for vault in folder)

From `/.claude/encryption-key-hierarchy.md`:

```
Folder symmetric key (from folder_key_shares, decrypted with user's private key)
  └── Vault symmetric key (encrypted with Folder key, stored in vaults.symmetricKey)
        └── Vault content (encrypted with Vault key via secretstream)
```

`vaults.symmetricKey` stores the vault key encrypted with the folder's symmetric key. Since `SymmetricCrypto.encrypt()` returns `{ nonce, ciphertext }`, this is stored as JSON.

`vaults.contentNonce` stores the secretstream header (base64), needed to init decryption.

## Behavioral Changes

- New endpoints: `POST /vaults/presign` (returns presigned PUT URL + s3Key), `POST /vaults` (creates vault record).
- `vaults` table: `encryptedName` column removed.
- New `StreamCrypto` class on frontend for chunked file encryption.
- `UploadFileModal` becomes functional: file picker → encrypt → upload to R2 → save metadata.
- Files appear in the folder's vault list after upload.

## Phases

| # | Name | Plan | Depends on |
|---|------|------|------------|
| 1 | [S3 + Backend vault endpoints](phase-1-s3-backend/plan.md) | Install S3 SDK, add R2 config, remove `encryptedName`, create presign + create-vault endpoints | — |
| 2 | [StreamCrypto + Frontend upload](phase-2-stream-crypto-upload/plan.md) | New StreamCrypto class, upload modal UI, full encrypt→upload→save flow, API hooks | Phase 1 |

## Out of Scope

- File download / decryption
- Sharing vaults with other users
- Standalone vaults (not in a folder)
- Multipart upload for files > 5GB
- Binary file types (images, video) — text files only for now
- File versioning
- Progress bar during upload
- Bucket lifecycle rules / orphan cleanup
- Drag-and-drop upload
