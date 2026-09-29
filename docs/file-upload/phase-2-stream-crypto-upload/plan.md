# Phase 2: StreamCrypto + Frontend Upload

**Size:** ~8 new/modified files across frontend + shared. No backend changes.

**Why this approach is sufficient:** This phase wires up the frontend upload flow: a new `StreamCrypto` class for chunked encryption, two API hooks, and a functional `UploadFileModal`. It does NOT add download/decryption, drag-and-drop, progress bars, or multipart upload — those are out of scope.

## Prerequisites from Phase 1

Before starting, verify these exist:

1. `packages/shared/src/index.ts` contains `IPresignVaultRequest`, `IPresignVaultResponse`, `ICreateVaultRequest`, `ICreateVaultResponse`.
2. `packages/shared/src/index.ts` — `Vault` interface does NOT have `encryptedName`.
3. Backend endpoints `POST /vaults/presign` and `POST /vaults` are implemented and the backend compiles (`npx tsc --build` in `packages/backend`).

If any are missing, STOP — Phase 1 was not completed.

## Steps

### 1. Create StreamCrypto class

**New file:** `packages/frontend/src/utils/crypto/StreamCrypto/index.ts`

Pattern: follow `packages/frontend/src/utils/crypto/SymmetricCrypto/index.ts` (same folder structure, static class, `await sodium.ready` init pattern).

```ts
import sodium from "libsodium-wrappers-sumo";

const CHUNK_SIZE = 64 * 1024; // 64 KB input chunks

export class StreamCrypto {
  private static async init(): Promise<void> {
    await sodium.ready;
  }

  /**
   * Encrypts a File using secretstream.
   * Returns { header: string (base64), encryptedBlob: Blob }.
   * The header is needed to initialize decryption later (stored as vaults.contentNonce).
   */
  static async encryptFile(
    file: File,
    keyHex: string,
  ): Promise<{ header: string; encryptedBlob: Blob }> {
    await this.init();

    const key = sodium.from_hex(keyHex);
    const { state, header } =
      sodium.crypto_secretstream_xchacha20poly1305_init_push(key);

    const chunks: Uint8Array[] = [];
    const totalBytes = file.size;
    let offset = 0;

    while (offset < totalBytes) {
      const end = Math.min(offset + CHUNK_SIZE, totalBytes);
      const slice = file.slice(offset, end);
      const buffer = new Uint8Array(await slice.arrayBuffer());

      const isLast = end === totalBytes;
      const tag = isLast
        ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
        : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;

      const encryptedChunk =
        sodium.crypto_secretstream_xchacha20poly1305_push(
          state,
          buffer,
          null,
          tag,
        );

      chunks.push(encryptedChunk);
      offset = end;
    }

    return {
      header: sodium.to_base64(header, sodium.base64_variants.ORIGINAL),
      encryptedBlob: new Blob(chunks, { type: "application/octet-stream" }),
    };
  }
}
```

Key design notes:
- Uses `crypto_secretstream_xchacha20poly1305` (XChaCha20-Poly1305 in streaming mode).
- 64 KB input chunks (each chunk gets a 17-byte auth tag overhead, so output chunks are 64KB + 17 bytes).
- `keyHex` is the vault's symmetric key (hex string, same format as `SymmetricCrypto.generateKey()` output).
- Returns base64-encoded header (24 bytes) — stored as `vaults.contentNonce`.
- The `TAG_FINAL` on the last chunk ensures the stream is properly terminated and any truncation is detectable.
- No decryption method in this phase — that's out of scope.

### 2. Add endpoint and query key enums

**File:** `packages/frontend/src/enums/api/EndpointEnum/index.ts`

Add:
```ts
VAULTS_PRESIGN = "/vaults/presign",
VAULTS = "/vaults",
```

**File:** `packages/frontend/src/enums/api/QueryKeyEnum/index.ts`

Add:
```ts
VAULTS = "vaults",
```

### 3. Create usePostPresignVault hook

**New file:** `packages/frontend/src/api/hooks/usePostPresignVault/index.ts`

Pattern: copy from `packages/frontend/src/api/hooks/usePostCreateFolder/index.ts`.

```ts
import type { IPresignVaultRequest, IPresignVaultResponse } from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const usePostPresignVault = () => {
  return useApiPost<IPresignVaultRequest, IPresignVaultResponse>(
    EndpointEnum.VAULTS_PRESIGN,
  );
};
```

No query invalidation needed — this is a preparatory call, not a mutation that changes cached data.

### 4. Create usePostCreateVault hook

**New file:** `packages/frontend/src/api/hooks/usePostCreateVault/index.ts`

Pattern: copy from `packages/frontend/src/api/hooks/usePostCreateFolder/index.ts`.

```ts
import { useQueryClient } from "@tanstack/react-query";
import type { ICreateVaultRequest, ICreateVaultResponse } from "@tayemno/shared";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostCreateVault = () => {
  const queryClient = useQueryClient();

  return useApiPost<ICreateVaultRequest, ICreateVaultResponse>(
    EndpointEnum.VAULTS,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.VAULTS] });
      },
    },
  );
};
```

### 5. Create useGetVaults hook

**New file:** `packages/frontend/src/api/hooks/useGetVaults/index.ts`

Pattern: copy from `packages/frontend/src/api/hooks/useGetFolders/index.ts`.

This hook fetches vaults for a given folder. The endpoint is `GET /vaults?folderId=<id>`.

**But wait** — this requires a backend `GET /vaults` endpoint that doesn't exist yet (Phase 1 only created presign + create). There are two options:

**Option A (recommended):** Skip this hook for now. Keep the hardcoded empty array in `HomePage`. Phase 2 focuses on the upload flow only. A `GET /vaults` endpoint + hook would be a separate small task.

**Option B:** Add the GET endpoint to backend in this phase too.

**Decision needed:** The executing session must ask the user which option to pick. Do NOT assume.

### 6. Make UploadFileModal functional

**File:** `packages/frontend/src/components/files/UploadFileModal/index.tsx`

Replace the placeholder content with a real upload form. The modal should:

1. Accept `folderId: string` prop (passed from `AddNewEntity`).
2. Have a file input (`<input type="file" />`) — use Mantine's `FileInput` component.
3. Have a submit button.
4. On submit, execute the full upload flow (see step 7).
5. Use Formik for form state (matching `CreateFolderModal` pattern).
6. Disable submit while uploading (`isPending` from mutations).

Updated interface:
```ts
interface IProps {
  opened: boolean;
  onClose: () => void;
  folderId: string;
}
```

UI structure:
```tsx
<Modal opened={opened} onClose={onClose} title={t("files.uploadFile.title")}>
  <form onSubmit={formik.handleSubmit}>
    <Stack>
      <FileInput
        label={t("files.uploadFile.fields.file.label")}
        placeholder={t("files.uploadFile.fields.file.placeholder")}
        accept=".txt,.md,.ts,.tsx,.js,.jsx,.css,.html,.json,.xml,.csv,.yaml,.yml,.toml,.ini,.cfg,.conf,.log,.sql,.sh,.bash,.zsh,.py,.rb,.go,.rs,.java,.kt,.swift,.c,.cpp,.h,.hpp,.cs,.php,.pl,.lua,.r,.m,.docx,.rtf,.tex,.org"
        value={formik.values.file}
        onChange={(file) => formik.setFieldValue("file", file)}
        error={formik.touched.file && formik.errors.file && t(formik.errors.file)}
      />
      <Button type="submit" fullWidth loading={isUploading}>
        {t("files.uploadFile.submit")}
      </Button>
    </Stack>
  </form>
</Modal>
```

Note: `FileInput` is from `@mantine/core` — check if a wrapper exists in `components/ui/`. If not, import directly from `@mantine/core` (do NOT create a wrapper for a single use).

### 7. Implement upload flow in UploadFileModal

The full encryption + upload flow on form submit:

```ts
const handleSubmit = async (values: { file: File | null }) => {
  if (!values.file || !folderId || !keyPair) return;

  const file = values.file;

  // 1. Get the folder's symmetric key (decrypt from folderKeyShares)
  //    The folder's encrypted symmetric key is available from useGetFolders data.
  //    Decrypt it using the user's private key.
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;
  const folderKey = await AsymmetricCrypto.decrypt(
    folder.symmetricKey,
    keyPair.privateKey,
  );

  // 2. Generate a new vault symmetric key
  const vaultKey = await SymmetricCrypto.generateKey();

  // 3. Encrypt the file content with the vault key using StreamCrypto
  const { header, encryptedBlob } = await StreamCrypto.encryptFile(file, vaultKey);

  // 4. Encrypt the vault key with the folder key (using SymmetricCrypto)
  const encryptedVaultKey = await SymmetricCrypto.encrypt(vaultKey, folderKey);

  // 5. Extract file metadata
  const fileName = file.name;
  const extension = fileName.includes(".") ? fileName.split(".").pop()! : "";
  const mimeType = file.type || "application/octet-stream";

  // 6. Request presigned URL from backend
  const presignResult = await presignVault.mutateAsync({
    folderId,
    fileName,
    mimeType,
  });

  // 7. Upload encrypted blob directly to R2 using presigned URL
  await fetch(presignResult.presignedUrl, {
    method: "PUT",
    body: encryptedBlob,
    headers: { "Content-Type": "application/octet-stream" },
  });

  // 8. Create vault record in backend
  await createVault.mutateAsync({
    folderId,
    name: fileName,
    mimeType,
    extension,
    sizeBytes: encryptedBlob.size,
    s3Key: presignResult.s3Key,
    contentNonce: header,
    symmetricKey: JSON.stringify(encryptedVaultKey),
  });

  // 9. Close modal
  onClose();
};
```

Key details:
- `encryptedVaultKey` from `SymmetricCrypto.encrypt()` returns `{ nonce: string, ciphertext: string }`. This is JSON-stringified and stored in `vaults.symmetricKey`.
- `sizeBytes` is the **encrypted** blob size (not the original file size), since that's what's stored in R2.
- `contentNonce` is the secretstream header (base64), needed to initialize decryption later.
- The `fetch()` call to R2 does NOT go through our Axios instance — it's a direct PUT to the presigned URL.
- `keyPair` comes from `useAuth()` context (`keyPair.privateKey`).
- `folders` data comes from `useGetFolders()` — the component needs access to this.

### 8. Update AddNewEntity to pass folderId to UploadFileModal

**File:** `packages/frontend/src/components/files/AddNewEntity/index.tsx`

The `UploadFileModal` now requires `folderId: string`. Update the prop:

```tsx
<UploadFileModal
  opened={fileModalOpened}
  onClose={closeFileModal}
  folderId={folderId}
/>
```

This means the upload button in the menu should only appear when `folderId` is not null (user is inside a folder). Currently the menu item for file upload always shows. Update to conditionally render, opposite of the folder item:

```tsx
{props.folderId && (
  <Menu.Item
    leftSection={<IconUpload size={16} />}
    onClick={openFileModal}
  >
    {t("files.menu.file")}
  </Menu.Item>
)}
```

And update the `UploadFileModal` render to only mount when `folderId` exists:

```tsx
{props.folderId && (
  <UploadFileModal
    opened={fileModalOpened}
    onClose={closeFileModal}
    folderId={props.folderId}
  />
)}
```

### 9. Add i18n keys

**File:** the appropriate locale JSON file(s) in `packages/frontend/src/`.

Add under `files.uploadFile`:
```json
{
  "files": {
    "uploadFile": {
      "title": "Upload file",
      "fields": {
        "file": {
          "label": "File",
          "placeholder": "Choose a file"
        }
      },
      "submit": "Upload"
    }
  }
}
```

Check the existing i18n file structure first — find where `files.createFolder.title` is defined and add the upload keys in the same file, same structure.

### 10. Add Yup validation schema for upload form

**New file:** `packages/frontend/src/validations/uploadFileSchema/index.ts`

Pattern: copy from `packages/frontend/src/validations/createFolderSchema/index.ts`.

```ts
import * as yup from "yup";

export const uploadFileSchema = yup.object({
  file: yup.mixed<File>().required("files.uploadFile.fields.file.required"),
});
```

Check how `createFolderSchema` uses i18n keys for error messages and follow the same pattern.
