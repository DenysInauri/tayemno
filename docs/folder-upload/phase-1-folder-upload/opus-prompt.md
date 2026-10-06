# Phase 1 — Folder Upload

You are implementing Phase 1 of the "Folder Upload" feature for Tayemno, a monorepo with a React (Vite + Mantine) frontend and Fastify backend. You are working from the repo root at `/Users/inaurifam/Desktop/tayemno`. This is a frontend-only change — no backend modifications.

The feature adds a "Upload folder" button that opens the browser's directory picker, recreates the folder tree on the backend via existing endpoints, uploads all files with E2E encryption, shows a single aggregated progress item in the TransferPanel, and cascade-deletes everything on cancel.

---

## Step 0 — Verify prerequisites and read context

There are no earlier phases. This is Phase 1.

Read these files in this exact order before writing any code:

1. **The plan:** `docs/folder-upload/phase-1-folder-upload/plan.md` — follow it exactly.
2. **The README:** `docs/folder-upload/README.md` — especially the Verified Findings and Out of Scope sections.
3. **Project rules:** `.claude/CLAUDE.md`, `.claude/frontend/code-style.md`, `.claude/frontend/ui-guide.md`, `.claude/frontend/api-guide.md`.
4. **Existing upload context (the sibling pattern to imitate):** `packages/frontend/src/contexts/UploadContext/index.tsx` — study the `upload` function structure, how it uses `uploadsRef`, `controllersRef`, `syncUploads`, `createThrottledProgress`, `buildVaultEncryptionKey`, `StreamCrypto.encryptFile`, `uploadWithProgress`, error handling. Your `uploadFolder` function follows the same patterns.
5. **Folder creation pattern (the sibling to imitate for creating folders):** `packages/frontend/src/components/files/AddNewEntity/index.tsx` lines 37-61 — study `handleCreateFolder` for the encryption key generation and `createFolder.mutateAsync()` call shape.
6. **TransferAlert interface:** `packages/frontend/src/components/files/TransferAlert/index.tsx` — verify `ITransferItem` is still `{ id, fileName, progress }`.
7. **AddNewEntity component:** `packages/frontend/src/components/files/AddNewEntity/index.tsx` — the file you'll modify to add the folder input and button.
8. **i18n file:** `packages/frontend/src/i18n/locales/en.json` — find the `files.uploadFileButton` key to add the new key next to it.
9. **Hooks you'll import:**
   - `packages/frontend/src/api/hooks/usePostCreateFolder/index.ts`
   - `packages/frontend/src/api/hooks/useDeleteFolder/index.ts`
   - `packages/frontend/src/api/hooks/usePostPresignVault/index.ts` (already imported)
   - `packages/frontend/src/api/hooks/usePostCreateVault/index.ts` (already imported)
10. **Crypto utilities:**
    - `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts` — verify `generateKey()`, `encrypt()` signatures.
    - `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts` — verify `encrypt()` signature.
    - `packages/frontend/src/utils/crypto/StreamCrypto/index.ts` — verify `encryptFile()` signature.
11. **Upload utility:** `packages/frontend/src/utils/uploadWithProgress/index.ts` — verify signature.
12. **Throttle utility:** `packages/frontend/src/utils/createThrottledProgress/index.ts` — verify signature.

---

## The task — follow the plan exactly

The plan has 4 steps. Execute them in order.

### Step 1: Extend `UploadContext` with `uploadFolder`

File: `packages/frontend/src/contexts/UploadContext/index.tsx`

Follow plan steps 1.1 through 1.8 precisely. Key implementation details:

**Algorithm — depth-first traversal (critical, read carefully):**

The folder tree is processed depth-first. At each folder node: create the folder, upload its direct files (with concurrency), then recurse into each child subfolder sequentially. This is NOT "create all folders then upload all files."

Example for `folderA/`:
```
folderA/
  file1.txt
  file2.txt
  subA/
    file3.txt
    subAA/
      file4.txt
  subB/
    file5.txt
```

Execution order:
1. Create `folderA` → upload `file1.txt`, `file2.txt` (concurrent, up to 3)
2. Create `subA` → upload `file3.txt`
3. Create `subAA` → upload `file4.txt`
4. Create `subB` → upload `file5.txt`

**Building the tree from `webkitRelativePath`:**
- Each `File` in the `FileList` has a `webkitRelativePath` property (e.g., `"folderA/subA/file3.txt"`).
- Build an in-memory tree: `interface IFolderNode { name: string; files: File[]; children: IFolderNode[]; }`
- The root node's name is the first path segment (e.g., `"folderA"`).

**The recursive `processFolder(node, parentFolderId)` function:**
1. Check `controller.signal.aborted` — throw `AbortError` if aborted.
2. Create the folder: generate symmetric key, encrypt with `workspace.adminPublicKey` and `user.publicKey` (same pattern as `AddNewEntity.handleCreateFolder` lines 40-58), call `createFolder.mutateAsync()`. If this is the root folder, store its ID in `folderCleanupRef`.
3. Upload all direct files in `node.files` using the concurrency pool (limit = 3). Each file: generate vault key, encrypt vault key with folder's symmetric key (symmetric via `SymmetricCrypto.encrypt`, matching `buildVaultEncryptionKey` lines 59-62), encrypt file, presign, upload to S3, create vault.
4. Recurse into each `node.children` sequentially (awaited, not parallel).

**Concurrency is ONLY for file uploads within a single folder.** Folder creation and the DFS traversal are sequential.

**Progress:**
- Maintain a `number[]` (one entry per file across all folders, initialized to 0, indexed by a global counter).
- Each file reports 0-50% for encryption, 50-100% for S3 upload (same split as existing `upload`).
- Aggregate: `Math.round(sum / totalFiles)`.
- Use `createThrottledProgress` for UI updates.

**Cancel cleanup:**
- Store root folder ID in `folderCleanupRef` after creating the first folder.
- In catch block: if `AbortError` and root folder ID exists, call `deleteFolder.mutateAsync()` (best-effort, wrapped in try/catch).
- Also cascade-delete on non-abort errors if a root folder was created.

### Step 2: Add folder input and button to `AddNewEntity`

File: `packages/frontend/src/components/files/AddNewEntity/index.tsx`

Follow plan steps 2.1 through 2.5. Check if `IconFolderUp` exists in `@tabler/icons-react` — if it does, use it for the folder upload button; if not, use `IconUpload`.

For the `webkitdirectory` attribute on the input element, use the spread pattern to avoid TypeScript JSX errors:
```tsx
{...{ webkitdirectory: "", directory: "" }}
```

### Step 3: Add i18n key

File: `packages/frontend/src/i18n/locales/en.json`

Add `"uploadFolderButton": "Upload folder"` next to the existing `"uploadFileButton"` key.

### Step 4: Verify TransferAlert/TransferPanel need no changes

Read `TransferAlert/index.tsx` and `TransferPanel/index.tsx` one more time and confirm no changes are needed. The existing `ITransferItem` interface and cancel mechanism work as-is for folder uploads.

---

## Explicitly forbidden in this phase

- Do NOT modify any backend files (`packages/backend/`).
- Do NOT modify `packages/shared/`.
- Do NOT modify `TransferAlert/index.tsx` or `TransferPanel/index.tsx` unless you discover the existing interface is genuinely insufficient (if so, stop and explain why).
- Do NOT add new API hooks or endpoints. Use only existing hooks: `usePostCreateFolder`, `useDeleteFolder`, `usePostPresignVault`, `usePostCreateVault`.
- Do NOT add a `beforeunload` handler.
- Do NOT filter hidden files (`.DS_Store`, etc.).
- Do NOT create empty directories (browser API doesn't support it).
- Do NOT add drag-and-drop folder upload.
- Do NOT extract the concurrency pool into a separate utility file — inline it in the `uploadFolder` function.
- Do NOT create a new context or provider. Extend the existing `UploadContext`.

---

## Hard rules

- **Arrow functions only** — no `function` keyword.
- **Interface naming** — prefix with `I` (e.g., `IFolderKeyEntry`).
- **Folder-based file structure** — `ComponentName/index.tsx`.
- **SizeEnum** — use for all numeric spacing values.
- **Import order** — external libraries first, then internal components/utils, separated by blank lines.
- **No raw endpoint strings** — use `EndpointEnum` and `QueryKeyEnum` enums.
- **No `Co-Authored-By`** in commit messages (per `.claude/CLAUDE.md`).
- **Do NOT commit or push.** Leave changes uncommitted for review.
- **Do NOT run destructive git commands** (`reset --hard`, `checkout .`, `clean -f`, etc.).

---

## Verify

After completing all steps, run:

```bash
# Type check
npm run build -w packages/frontend

# Verify only the expected files changed
git diff --name-only
```

Expected files in the diff (and nothing else):

```
packages/frontend/src/contexts/UploadContext/index.tsx
packages/frontend/src/components/files/AddNewEntity/index.tsx
packages/frontend/src/i18n/locales/en.json
```

If any other files appear in the diff, stop and explain why.

---

## Report

When done, summarize:
1. What was added/changed in each file.
2. The `git diff --stat` output.
3. Whether the build succeeded.
4. Any issues or deviations from the plan (and why).

Then stop — the user reviews before the next phase.
