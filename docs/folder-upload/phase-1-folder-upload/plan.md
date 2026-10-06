# Phase 1 — Folder Upload

**Shape:** ~4 files modified, ~1 new utility file. All frontend. No backend changes.

**Why this approach is sufficient — don't add anything beyond this:** The existing backend endpoints (create folder, presign vault, create vault, delete folder with cascade) already support everything needed. The only gap is the frontend: a directory-picker input, folder-tree parsing from `webkitRelativePath`, sequential folder creation with a local key cache, parallel file uploads with aggregated progress, and cancel-with-cleanup. No new API endpoints, no new shared types, no new backend logic.

---

## Step 1 — Add `uploadFolder` to the UploadContext

**File:** `packages/frontend/src/contexts/UploadContext/index.tsx`

### 1.1 Add new imports

Add imports at the top of the file:

```typescript
// Add to existing imports:
import { usePostCreateFolder } from "../../api/hooks/usePostCreateFolder";
import { useDeleteFolder } from "../../api/hooks/useDeleteFolder";
```

### 1.2 Extend the `IUploadContext` interface

**Before:**
```typescript
interface IUploadContext {
  uploads: ITransferItem[];
  upload: (file: File, folderId: string | null) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
}
```

**After:**
```typescript
interface IUploadContext {
  uploads: ITransferItem[];
  upload: (file: File, folderId: string | null) => void;
  uploadFolder: (files: FileList, parentFolderId: string | null) => void;
  cancel: (id: string) => void;
  cancelAll: () => void;
}
```

### 1.3 Add hook calls inside `UploadProvider`

After the existing `const createVault = usePostCreateVault();` line, add:

```typescript
const createFolder = usePostCreateFolder();
const deleteFolder = useDeleteFolder();
```

### 1.4 Add a `folderCleanupRef`

After the existing `controllersRef` line, add a ref to track which upload IDs are folder uploads and their root folder IDs (for cascade delete on cancel):

```typescript
const folderCleanupRef = useRef<Map<string, string>>(new Map()); // uploadId → rootFolderId
```

### 1.5 Implement the `uploadFolder` function

Add this function after the existing `upload` callback (around line 181).

#### Algorithm — depth-first traversal

The algorithm processes the folder tree **depth-first**: at each folder node, create the folder, upload its direct files (with concurrency), then recurse into each child subfolder before moving to the next sibling.

Example for a folder `folderA`:
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
2. Create `subA` → upload `file3.txt` (concurrent)
3. Create `subAA` → upload `file4.txt` (concurrent)
4. Create `subB` → upload `file5.txt` (concurrent)

Only file uploads within a single folder use concurrency. Folder creation and the DFS traversal itself are sequential.

#### Implementation steps

1. **Build a tree from `webkitRelativePath`.** Each `File` in the `FileList` has a `webkitRelativePath` like `"folderA/subA/file3.txt"`. Build an in-memory tree structure:

   ```typescript
   interface IFolderNode {
     name: string;             // e.g., "subA"
     files: File[];            // direct files in this folder
     children: IFolderNode[];  // child subfolders
   }
   ```

   Parse all files into this tree. The root node's name is the first path segment (e.g., `"folderA"`).

2. **Register a single `ITransferItem`** using the root folder name as `fileName`. Track total file count from the `FileList.length` for progress aggregation.

3. **Define a recursive `processFolder` function** that takes `(node: IFolderNode, parentFolderId: string | null)`:

   a. **Check abort** — if `controller.signal.aborted`, throw `AbortError`.

   b. **Create the folder:**
      - Generate a symmetric key (`SymmetricCrypto.generateKey()`).
      - Encrypt with `workspace.adminPublicKey` and `user.publicKey` (same pattern as `AddNewEntity:40-48`).
      - Encrypt folder name with the generated key.
      - Call `createFolder.mutateAsync()` with `parentFolderId`.
      - Store `{ folderId: result.folder.id, symmetricKey }` for use in file uploads below.
      - If this is the root folder (first call), store its ID in `folderCleanupRef` keyed by the upload ID.

   c. **Upload all direct files (concurrent, limit = 3):**
      - For each file in `node.files`, use the concurrency pool pattern (see below).
      - Each file upload:
        - Generate a vault symmetric key.
        - Encrypt vault key with the folder's symmetric key (symmetric, via `SymmetricCrypto.encrypt` — same as `buildVaultEncryptionKey` lines 59-62).
        - Encrypt file content via `StreamCrypto.encryptFile`.
        - Extract and encrypt metadata (extension, mimeType, sizeBytes) and filename.
        - Presign via `presignVault.mutateAsync({ workspaceId, folderId })`.
        - Upload to S3 via `uploadWithProgress`.
        - Create vault via `createVault.mutateAsync`.
        - Update per-file progress and aggregate into the single transfer item.

   d. **Recurse into each child subfolder** — `for (const child of node.children)`, call `processFolder(child, folderId)` sequentially (awaited, not parallel).

4. **Concurrency control for file uploads within a folder.** Use a simple pool pattern inside `processFolder` step (c):
   ```typescript
   const CONCURRENCY = 3;
   const executing = new Set<Promise<void>>();

   for (const file of node.files) {
     if (controller.signal.aborted) break;

     const p = uploadSingleFile(file)
       .then(() => { executing.delete(p); })
       .catch(() => { executing.delete(p); });
     executing.add(p);

     if (executing.size >= CONCURRENCY) {
       await Promise.race(executing);
     }
   }

   await Promise.allSettled(executing);
   ```

5. **Progress aggregation.** Maintain a `number[]` of per-file progresses indexed by a global file counter (0-100 per file). On each file progress update:
   ```typescript
   const aggregate = Math.round(
     fileProgresses.reduce((sum, p) => sum + p, 0) / totalFiles
   );
   ```
   Use `createThrottledProgress` for the aggregate UI updates (same 150ms throttle as individual uploads). Each file tracks 0-50% for encryption, 50-100% for S3 upload (same split as existing `upload`).

6. **Success path:** Flush progress, clean up refs, invalidate `CLAUDE_STATE`.

7. **Cancel/abort path:** In the `catch` block, if `err.name === "AbortError"` and `folderCleanupRef` has a root folder ID for this upload, call `deleteFolder.mutateAsync({ folderId: rootFolderId })` wrapped in a try/catch (best-effort cleanup). Then clean up refs.

8. **Error path (non-abort):** If a non-abort error occurs (e.g., network failure during folder creation or file upload), also cascade-delete the root folder if one was created, then rethrow. This ensures partial data is cleaned up on errors too.

**Critical detail — do NOT use `buildVaultEncryptionKey` for folder upload files.** That function reads from `claudeState.foldersById` which won't have the newly created folders. Instead, use the symmetric key returned from the folder creation step directly within `processFolder`.

### 1.6 Modify the `cancel` callback

**Before:**
```typescript
const cancel = useCallback((id: string) => {
  controllersRef.current.get(id)?.abort();
}, []);
```

No change needed to this function. The abort signal propagates to the `uploadFolder`'s catch block, which handles cascade delete via `folderCleanupRef`. The existing abort-based cleanup in `uploadFolder`'s try/catch handles everything.

### 1.7 Update the Provider value

**Before:**
```typescript
<UploadContext.Provider value={{ uploads, upload, cancel, cancelAll }}>
```

**After:**
```typescript
<UploadContext.Provider value={{ uploads, upload, uploadFolder, cancel, cancelAll }}>
```

### 1.8 Dependency array for `uploadFolder`

Same pattern as `upload`:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
[keyPair, workspace, user]
```

---

## Step 2 — Add folder input and button to AddNewEntity

**File:** `packages/frontend/src/components/files/AddNewEntity/index.tsx`

### 2.1 Add a second ref for the folder input

After the existing `const fileInputRef = useRef<HTMLInputElement>(null);` (line 31), add:

```typescript
const folderInputRef = useRef<HTMLInputElement>(null);
```

### 2.2 Get `uploadFolder` from the upload context

**Before:**
```typescript
const { upload } = useUpload();
```

**After:**
```typescript
const { upload, uploadFolder } = useUpload();
```

### 2.3 Add a `handleFolderChange` handler

After the existing `handleFileChange` function (line 63-69), add:

```typescript
const handleFolderChange = (e: ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  uploadFolder(files, props.folderId);
  e.target.value = "";
};
```

### 2.4 Add the "Upload folder" button to the JSX

Insert a new button after the existing "Upload file" button (after line 84), before the "Add folder" button:

```tsx
<Button
  variant="default"
  leftSection={<IconUpload size={16} />}
  onClick={() => folderInputRef.current?.click()}
>
  {t("files.uploadFolderButton")}
</Button>
```

Note: Reuse `IconUpload` for consistency. If a more specific icon like `IconFolderUp` exists in `@tabler/icons-react`, prefer that — but verify it exists first; do not guess.

### 2.5 Add the hidden folder input

After the existing hidden file input (after line 99), add:

```tsx
<input
  ref={folderInputRef}
  type="file"
  onChange={handleFolderChange}
  style={{ display: "none" }}
  {...{ webkitdirectory: "", directory: "" }}
/>
```

Note: `webkitdirectory` and `directory` are non-standard attributes. Use the spread syntax to avoid TypeScript errors with JSX.

---

## Step 3 — Add the i18n key

**File:** `packages/frontend/src/i18n/locales/en.json`

Add `uploadFolderButton` next to the existing `uploadFileButton` key (around line 111):

**Before:**
```json
"uploadFileButton": "Upload file",
```

**After:**
```json
"uploadFileButton": "Upload file",
"uploadFolderButton": "Upload folder",
```

---

## Step 4 — Verify no TransferAlert/TransferPanel changes needed

The `ITransferItem` interface (`{ id, fileName, progress }`) already supports folder uploads as-is:
- `fileName` → set to the root folder name (e.g., `"photos"`)
- `progress` → aggregated across all files (0-100)
- Cancel (X) button → calls `cancel(id)` which aborts the controller, triggering cascade delete in `uploadFolder`'s catch block

**No changes to TransferAlert or TransferPanel are required.**

---

## Summary of changes

| File | Change |
|------|--------|
| `packages/frontend/src/contexts/UploadContext/index.tsx` | Add `uploadFolder` function, `folderCleanupRef`, new imports, extend interface and provider value |
| `packages/frontend/src/components/files/AddNewEntity/index.tsx` | Add folder input ref, folder input element, upload folder button, `handleFolderChange` handler |
| `packages/frontend/src/i18n/locales/en.json` | Add `files.uploadFolderButton` key |
