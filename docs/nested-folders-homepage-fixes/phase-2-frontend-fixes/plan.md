# Phase 2: Frontend — Hooks + Components Fixes

**Size:** ~7 modified files in frontend. No backend or shared changes.

**Why this approach is sufficient:** This phase wires the frontend to the updated backend APIs: filtered folder queries, root-level vault queries, root-level upload, breadcrumb name, and always-visible menu items. It does NOT add full breadcrumb trails, direct URL refresh support, drag-and-drop, or folder management UI — those are out of scope.

## Prerequisites from Phase 1

Before starting, verify:

1. `packages/shared/src/index.ts` — `Folder` interface has `parentFolderId: string | null`.
2. `packages/shared/src/index.ts` — `ICreateFolderRequest` has `parentFolderId?: string | null`.
3. `packages/shared/src/index.ts` — `IGetFoldersRequest` exists with `parentFolderId?: string`.
4. `packages/shared/src/index.ts` — `IGetVaultsRequest` has both `folderId?: string` and `workspaceId?: string`.
5. `packages/backend/src/db/schema.ts` — `folders` table has `parentFolderId` column.
6. Run `npx tsc --build` in `packages/backend` — must compile with zero errors.

If any of these are wrong, STOP and report — Phase 1 was not completed properly.

## Steps

### 1. Update `useGetFolders` — accept `parentFolderId`

**File:** `packages/frontend/src/api/hooks/useGetFolders/index.ts`

Before:
```ts
export const useGetFolders = () => {
  const { workspace } = useAuth();

  const query = useApiGet<IGetFoldersResponse, Folder[]>(
    [QueryKeyEnum.FOLDERS],
    `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders`,
    { select: (data) => data.folders },
  );

  const folders = query.data ?? [];
  const foldersById = useMemo(() => keyBy(folders, "id"), [folders]);

  return { ...query, data: folders, dataMap: foldersById };
};
```

After:
```ts
export const useGetFolders = (parentFolderId: string | null = null) => {
  const { workspace } = useAuth();

  const baseUrl = `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders`;
  const url = parentFolderId
    ? `${baseUrl}?parentFolderId=${parentFolderId}`
    : baseUrl;

  const query = useApiGet<IGetFoldersResponse, Folder[]>(
    [QueryKeyEnum.FOLDERS, parentFolderId],
    url,
    { select: (data) => data.folders },
  );

  const folders = query.data ?? [];
  const foldersById = useMemo(() => keyBy(folders, "id"), [folders]);

  return { ...query, data: folders, dataMap: foldersById };
};
```

Key details:
- Default `null` → no query param → backend returns root folders (IS NULL).
- Non-null string → `?parentFolderId=<uuid>` → backend returns children.
- Query key includes `parentFolderId` so different levels are cached separately.
- `invalidateQueries({ queryKey: [QueryKeyEnum.FOLDERS] })` in `usePostCreateFolder` is a prefix match — it invalidates ALL folder queries regardless of the second element. This is correct.

### 2. Update `useGetVaults` — support root level

**File:** `packages/frontend/src/api/hooks/useGetVaults/index.ts`

Before:
```ts
export const useGetVaults = (folderId: string | null) => {
  const query = useApiGet<IGetVaultsResponse, Vault[]>(
    [QueryKeyEnum.VAULTS, folderId],
    `${EndpointEnum.VAULTS}?folderId=${folderId}`,
    {
      select: (data) => data.vaults,
      enabled: !!folderId,
    },
  );

  return { ...query, data: query.data ?? [] };
};
```

After:
```ts
export const useGetVaults = (folderId: string | null, workspaceId: string) => {
  const url = folderId
    ? `${EndpointEnum.VAULTS}?folderId=${folderId}`
    : `${EndpointEnum.VAULTS}?workspaceId=${workspaceId}`;

  const query = useApiGet<IGetVaultsResponse, Vault[]>(
    [QueryKeyEnum.VAULTS, folderId ?? "root"],
    url,
    { select: (data) => data.vaults },
  );

  return { ...query, data: query.data ?? [] };
};
```

Key details:
- Removed `enabled: !!folderId` — the query always runs now.
- When `folderId` is null: sends `?workspaceId=<id>` instead of `?folderId=null`.
- Query key uses `"root"` as sentinel when folderId is null.

### 3. Update `useUploadVault` — accept `folderEncryptedKey` instead of looking up folders

**File:** `packages/frontend/src/api/hooks/useUploadVault/index.ts`

Before:
```ts
import { useState } from "react";

import { usePostPresignVault } from "../usePostPresignVault";
import { usePostCreateVault } from "../usePostCreateVault";
import { useGetFolders } from "../useGetFolders";
import { useAuth } from "../../../contexts/AuthContext";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";

export const useUploadVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const { dataMap: foldersById } = useGetFolders();
  const presignVault = usePostPresignVault();
  const createVault = usePostCreateVault();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File, folderId: string) => {
    if (!keyPair || !workspace || !user) return;

    const folder = foldersById[folderId];

    if (!folder) return;

    setIsUploading(true);

    try {
      const folderKey = await AsymmetricCrypto.decrypt(
        folder.encryptedSymmetricKey,
        user.publicKey,
        keyPair.privateKey,
      );

      const vaultKey = await SymmetricCrypto.generateKey();

      const { header, encryptedBlob } = await StreamCrypto.encryptFile(
        file,
        vaultKey,
      );

      const encryptedVaultKey = await SymmetricCrypto.encrypt(
        vaultKey,
        folderKey,
      );

      const fileName = file.name;
      const extension = fileName.includes(".")
        ? fileName.split(".").pop()!
        : "";
      const mimeType = file.type || "application/octet-stream";

      const presignResult = await presignVault.mutateAsync({
        workspaceId: workspace.id,
        folderId,
        fileName,
        mimeType,
      });

      await fetch(presignResult.presignedUrl, {
        method: "PUT",
        body: encryptedBlob,
        headers: { "Content-Type": "application/octet-stream" },
      });

      await createVault.mutateAsync({
        workspaceId: workspace.id,
        folderId,
        name: fileName,
        mimeType,
        extension,
        sizeBytes: encryptedBlob.size,
        s3Key: presignResult.s3Key,
        contentNonce: header,
        encryptedSymmetricKey: encryptedVaultKey.ciphertext,
        symmetricKeyNonce: encryptedVaultKey.nonce,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
```

After:
```ts
import { useState } from "react";

import { usePostPresignVault } from "../usePostPresignVault";
import { usePostCreateVault } from "../usePostCreateVault";
import { useAuth } from "../../../contexts/AuthContext";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { StreamCrypto } from "../../../utils/crypto/StreamCrypto";

export const useUploadVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const presignVault = usePostPresignVault();
  const createVault = usePostCreateVault();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (
    file: File,
    folderId: string | null,
    folderEncryptedKey: string | null,
  ) => {
    if (!keyPair || !workspace || !user) return;

    setIsUploading(true);

    try {
      const vaultKey = await SymmetricCrypto.generateKey();

      const { header, encryptedBlob } = await StreamCrypto.encryptFile(
        file,
        vaultKey,
      );

      let encryptedSymmetricKey: string;
      let symmetricKeyNonce: string | null;

      if (folderId && folderEncryptedKey) {
        // Vault inside a folder: encrypt vault key with folder symmetric key
        const folderKey = await AsymmetricCrypto.decrypt(
          folderEncryptedKey,
          user.publicKey,
          keyPair.privateKey,
        );

        const encryptedVaultKey = await SymmetricCrypto.encrypt(
          vaultKey,
          folderKey,
        );

        encryptedSymmetricKey = encryptedVaultKey.ciphertext;
        symmetricKeyNonce = encryptedVaultKey.nonce;
      } else {
        // Standalone vault (root): encrypt vault key with member workspace public key (sealed box)
        encryptedSymmetricKey = await AsymmetricCrypto.encrypt(
          vaultKey,
          workspace.memberPublicKey,
        );
        symmetricKeyNonce = null;
      }

      const fileName = file.name;
      const extension = fileName.includes(".")
        ? fileName.split(".").pop()!
        : "";
      const mimeType = file.type || "application/octet-stream";

      const presignResult = await presignVault.mutateAsync({
        workspaceId: workspace.id,
        folderId,
        fileName,
        mimeType,
      });

      await fetch(presignResult.presignedUrl, {
        method: "PUT",
        body: encryptedBlob,
        headers: { "Content-Type": "application/octet-stream" },
      });

      await createVault.mutateAsync({
        workspaceId: workspace.id,
        folderId,
        name: fileName,
        mimeType,
        extension,
        sizeBytes: encryptedBlob.size,
        s3Key: presignResult.s3Key,
        contentNonce: header,
        encryptedSymmetricKey,
        symmetricKeyNonce,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
```

Key details:
- Removed `useGetFolders` import and internal call — the hook no longer fetches folder data itself.
- `upload` signature changed: `(file, folderId, folderEncryptedKey)`. Both `folderId` and `folderEncryptedKey` are `string | null`.
- Folder path: decrypts folder key from `folderEncryptedKey`, encrypts vault key with it (XChaCha20-Poly1305, produces ciphertext + nonce).
- Root path: encrypts vault key with `workspace.memberPublicKey` (sealed box, nonce is null). This follows the "Standalone vault" path in `encryption-key-hierarchy.md`.
- `presignVault.mutateAsync` already accepts `folderId?: string | null` — passing null is fine.
- `createVault.mutateAsync` already accepts `folderId?: string | null` and `symmetricKeyNonce?: string | null`.

### 4. Update `FoldersList` — pass folder data via route state

**File:** `packages/frontend/src/components/files/FoldersList/index.tsx`

Before:
```ts
          onClick={() =>
            navigate(RouteEnum.FOLDER.replace(":folderId", folder.id))
          }
```

After:
```ts
          onClick={() =>
            navigate(RouteEnum.FOLDER.replace(":folderId", folder.id), {
              state: {
                folderName: folder.name,
                folderEncryptedKey: folder.encryptedSymmetricKey,
              },
            })
          }
```

This passes the folder name (for breadcrumb) and encrypted key (for upload) through React Router location state.

### 5. Update `HomePage` — use filtered folders, fix breadcrumb, pass state to children

**File:** `packages/frontend/src/pages/HomePage/index.tsx`

Before:
```ts
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Table } from "@mantine/core";

import { Stack } from "../../components/ui/Stack";
import { Group } from "../../components/ui/Group";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { Text } from "../../components/ui/Text";
import { Anchor } from "../../components/ui/Anchor";
import { EmptyState } from "../../components/files/EmptyState";
import { FoldersList } from "../../components/files/FoldersList";
import { VaultsList } from "../../components/files/VaultsList";
import { AddNewEntity } from "../../components/files/AddNewEntity";
import { useGetFolders } from "../../api/hooks/useGetFolders";
import { useGetVaults } from "../../api/hooks/useGetVaults";
import { RouteEnum } from "../../enums/routing/RouteEnum";
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const HomePage = () => {
  const routeParams = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const folderId = routeParams.folderId ?? null;

  const { data: folders } = useGetFolders();
  const { data: vaults } = useGetVaults(folderId);
  const isEmpty = folders.length === 0 && vaults.length === 0;

  return (
    <Stack gap={SizeEnum.MD} p={SizeEnum.MD}>
      <Group justify="space-between">
        <Breadcrumbs>
          <Anchor
            size="sm"
            component="button"
            type="button"
            onClick={() => navigate(RouteEnum.HOME)}
          >
            {t("files.breadcrumb.root")}
          </Anchor>
          {folderId && <Text size="sm">...</Text>}
        </Breadcrumbs>
        <AddNewEntity folderId={folderId} />
      </Group>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("files.columns.name")}</Table.Th>
              <Table.Th visibleFrom="sm">{t("files.columns.size")}</Table.Th>
              <Table.Th visibleFrom="sm">
                {t("files.columns.modified")}
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <FoldersList folders={folders} />
            <VaultsList vaults={vaults} />
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
};
```

After:
```ts
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Table } from "@mantine/core";

import { Stack } from "../../components/ui/Stack";
import { Group } from "../../components/ui/Group";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { Text } from "../../components/ui/Text";
import { Anchor } from "../../components/ui/Anchor";
import { EmptyState } from "../../components/files/EmptyState";
import { FoldersList } from "../../components/files/FoldersList";
import { VaultsList } from "../../components/files/VaultsList";
import { AddNewEntity } from "../../components/files/AddNewEntity";
import { useGetFolders } from "../../api/hooks/useGetFolders";
import { useGetVaults } from "../../api/hooks/useGetVaults";
import { useAuth } from "../../contexts/AuthContext";
import { RouteEnum } from "../../enums/routing/RouteEnum";
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const HomePage = () => {
  const routeParams = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { workspace } = useAuth();

  const folderId = routeParams.folderId ?? null;
  const state = location.state as {
    folderName?: string;
    folderEncryptedKey?: string;
  } | null;
  const folderName = state?.folderName;
  const folderEncryptedKey = state?.folderEncryptedKey ?? null;

  const { data: folders } = useGetFolders(folderId);
  const { data: vaults } = useGetVaults(folderId, workspace!.id);
  const isEmpty = folders.length === 0 && vaults.length === 0;

  return (
    <Stack gap={SizeEnum.MD} p={SizeEnum.MD}>
      <Group justify="space-between">
        <Breadcrumbs>
          <Anchor
            size="sm"
            component="button"
            type="button"
            onClick={() => navigate(RouteEnum.HOME)}
          >
            {t("files.breadcrumb.root")}
          </Anchor>
          {folderId && <Text size="sm">{folderName ?? folderId}</Text>}
        </Breadcrumbs>
        <AddNewEntity folderId={folderId} folderEncryptedKey={folderEncryptedKey} />
      </Group>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("files.columns.name")}</Table.Th>
              <Table.Th visibleFrom="sm">{t("files.columns.size")}</Table.Th>
              <Table.Th visibleFrom="sm">
                {t("files.columns.modified")}
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <FoldersList folders={folders} />
            <VaultsList vaults={vaults} />
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
};
```

Key changes:
- Import `useLocation` from react-router-dom and `useAuth` from contexts.
- Read `folderName` and `folderEncryptedKey` from `location.state`.
- Pass `folderId` to `useGetFolders(folderId)` — returns children of folderId (or root folders when null).
- Pass `workspace!.id` to `useGetVaults(folderId, workspace!.id)`. The `!` is safe because `HomePage` is inside a `ProtectedRoute` that guarantees auth.
- Breadcrumb shows `folderName` (from route state) or falls back to `folderId` (for direct URL access).
- Pass `folderEncryptedKey` to `AddNewEntity`.

### 6. Update `AddNewEntity` — always show both menu items, pass `parentFolderId` and `folderEncryptedKey`

**File:** `packages/frontend/src/components/files/AddNewEntity/index.tsx`

Before:
```ts
interface IProps {
  folderId: string | null;
}
```

After:
```ts
interface IProps {
  folderId: string | null;
  folderEncryptedKey: string | null;
}
```

Update `handleCreateFolder` to pass `parentFolderId`:

Before:
```ts
    createFolder.mutate({
      name,
      encryptedSymmetricKey: adminEncryptedKey,
      memberEncryptedSymmetricKey: memberEncryptedKey,
    });
```

After:
```ts
    createFolder.mutate({
      name,
      encryptedSymmetricKey: adminEncryptedKey,
      memberEncryptedSymmetricKey: memberEncryptedKey,
      parentFolderId: props.folderId,
    });
```

Note: the encryption for the new subfolder key stays the same — each folder gets its own independent key encrypted with workspace admin public key (master copy) and user public key (member copy). The `parentFolderId` is just metadata for the tree structure.

Update the menu to always show both items (remove conditionals):

Before:
```tsx
        <Menu.Dropdown>
          {!props.folderId && (
            <Menu.Item
              leftSection={<IconFolder size={16} />}
              onClick={openFolderModal}
            >
              {t("files.menu.folder")}
            </Menu.Item>
          )}
          {props.folderId && (
            <Menu.Item
              leftSection={<IconUpload size={16} />}
              onClick={openFileModal}
            >
              {t("files.menu.file")}
            </Menu.Item>
          )}
        </Menu.Dropdown>
```

After:
```tsx
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconFolder size={16} />}
            onClick={openFolderModal}
          >
            {t("files.menu.folder")}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconUpload size={16} />}
            onClick={openFileModal}
          >
            {t("files.menu.file")}
          </Menu.Item>
        </Menu.Dropdown>
```

Update `UploadFileModal` render — always render it (remove the `props.folderId &&` guard), pass new props:

Before:
```tsx
      {props.folderId && (
        <UploadFileModal
          opened={fileModalOpened}
          onClose={closeFileModal}
          folderId={props.folderId}
        />
      )}
```

After:
```tsx
      <UploadFileModal
        opened={fileModalOpened}
        onClose={closeFileModal}
        folderId={props.folderId}
        folderEncryptedKey={props.folderEncryptedKey}
      />
```

### 7. Update `UploadFileModal` — accept nullable `folderId` and `folderEncryptedKey`

**File:** `packages/frontend/src/components/files/UploadFileModal/index.tsx`

Before:
```ts
interface IProps {
  opened: boolean;
  onClose: () => void;
  folderId: string;
}
```

After:
```ts
interface IProps {
  opened: boolean;
  onClose: () => void;
  folderId: string | null;
  folderEncryptedKey: string | null;
}
```

Update the destructuring:

Before:
```ts
export const UploadFileModal = ({ opened, onClose, folderId }: IProps) => {
```

After:
```ts
export const UploadFileModal = ({ opened, onClose, folderId, folderEncryptedKey }: IProps) => {
```

Update the `upload` call in `onSubmit`:

Before:
```ts
        await upload(values.file, folderId);
```

After:
```ts
        await upload(values.file, folderId, folderEncryptedKey);
```

### 8. Verify

```bash
# 1. TypeScript check — must produce no errors
cd packages/frontend && npx tsc --noEmit

# 2. Vite build — must succeed
cd packages/frontend && npx vite build

# 3. Scope check
git diff --name-only
```

Expected files in the diff:

- `packages/frontend/src/api/hooks/useGetFolders/index.ts`
- `packages/frontend/src/api/hooks/useGetVaults/index.ts`
- `packages/frontend/src/api/hooks/useUploadVault/index.ts`
- `packages/frontend/src/components/files/FoldersList/index.tsx`
- `packages/frontend/src/pages/HomePage/index.tsx`
- `packages/frontend/src/components/files/AddNewEntity/index.tsx`
- `packages/frontend/src/components/files/UploadFileModal/index.tsx`

Nothing in `packages/backend/` or `packages/shared/` should be touched.
