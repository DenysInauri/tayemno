# Phase 2 -- Client Crypto + Integration

**Size**: ~2 new files, ~10 modified files. Large phase -- adds key wrapping/unwrapping utilities, a key chain resolver, and updates all frontend hooks/contexts that interact with folder encryption.

**Why this approach is sufficient -- don't add anything beyond this**: This phase makes the existing frontend work with the new backend from Phase 1. It does NOT add folder move UI (Phase 3), sharing UI (out of scope), or any new pages/modals. The goal is: create folders with parent-child key wrapping, decrypt folders via admin key or ACL chain, decrypt vaults using the new folder key access paths. The tree reconstruction utility is a pure function -- no UI consumes it yet beyond the existing `useFolders` hook.

## Steps

### 1. Create `KeyWrapping` utility -- `packages/frontend/src/utils/crypto/KeyWrapping/index.ts`

New file. Thin wrappers around `SymmetricCrypto` that express the key wrapping/unwrapping semantics clearly.

```ts
import { SymmetricCrypto } from "../SymmetricCrypto";

export interface IWrappedKey {
  wrappedKey: string;
  wrappedKeyNonce: string;
}

export const KeyWrapping = {
  wrapWithParent: async (
    childFolderKey: string,
    parentFolderKey: string,
  ): Promise<IWrappedKey> => {
    const result = await SymmetricCrypto.encrypt(childFolderKey, parentFolderKey);
    return {
      wrappedKey: result.ciphertext,
      wrappedKeyNonce: result.nonce,
    };
  },

  unwrapWithParent: async (
    wrappedKey: string,
    wrappedKeyNonce: string,
    parentFolderKey: string,
  ): Promise<string> => {
    return SymmetricCrypto.decrypt(
      { ciphertext: wrappedKey, nonce: wrappedKeyNonce },
      parentFolderKey,
    );
  },
};
```

This is intentionally thin. The value is in naming: `wrapWithParent`/`unwrapWithParent` communicate intent better than raw `encrypt`/`decrypt` in caller code.

### 2. Create `KeyChainResolver` utility -- `packages/frontend/src/utils/crypto/KeyChainResolver/index.ts`

New file. Given a set of folders and ACL entries, resolves the decrypted key for any accessible folder.

```ts
import type { Folder, FolderAcl } from "@tayemno/shared";
import { AsymmetricCrypto } from "../AsymmetricCrypto";
import { KeyWrapping } from "../KeyWrapping";

interface IResolverParams {
  folders: Folder[];
  acls: FolderAcl[];
  userPublicKey: string;
  userPrivateKey: string;
  workspaceAdminPublicKey: string;
  workspaceAdminPrivateKey: string | null; // null for members
}

export interface IResolvedFolder {
  id: string;
  parentFolderId: string | null;
  workspaceId: string;
  name: string;
  folderKey: string;
}

export const resolveAllFolderKeys = async (
  params: IResolverParams,
): Promise<Map<string, string>> => {
  // ... implementation described below
};

export const buildDecryptedTree = async (
  params: IResolverParams,
): Promise<IResolvedFolder[]> => {
  // ... implementation described below
};
```

**`resolveAllFolderKeys` algorithm:**

1. Build a `Map<string, Folder>` by folder ID for O(1) lookup.
2. Build an ACL lookup `Map<string, FolderAcl>` by folder ID.
3. Create a result `Map<string, string>` (folderId -> decrypted key).
4. Create a recursive `resolveKey(folderId: string): Promise<string>` function:
   a. If already in result map, return cached value.
   b. If `workspaceAdminPrivateKey` is available (admin/owner): decrypt `folder.encryptedSymmetricKey` using `AsymmetricCrypto.decrypt(folder.encryptedSymmetricKey, workspaceAdminPublicKey, workspaceAdminPrivateKey)`. Cache and return.
   c. If the folder has an ACL entry: decrypt `acl.encryptedFolderKey` using `AsymmetricCrypto.decrypt(acl.encryptedFolderKey, userPublicKey, userPrivateKey)`. Cache and return.
   d. If the folder has a `wrappedKey` (non-root, has parent): resolve the parent key first via `resolveKey(folder.parentFolderId)`, then unwrap: `KeyWrapping.unwrapWithParent(folder.wrappedKey, folder.wrappedKeyNonce, parentKey)`. Cache and return.
   e. If none of the above: throw an error (folder is not accessible).
5. Iterate all folders, calling `resolveKey` for each. Catch errors for inaccessible folders (skip them).
6. Return the result map.

**`buildDecryptedTree` algorithm:**

1. Call `resolveAllFolderKeys` to get the key map.
2. For each folder where a key was resolved, decrypt the name using `SymmetricCrypto.decrypt({nonce: folder.nameNonce, ciphertext: folder.encryptedName}, folderKey)`.
3. Return an array of `IResolvedFolder` objects.

This utility is a pure function -- no React hooks, no API calls, no side effects. It takes data and returns results.

### 3. Update `useGetFolderKey` -- `packages/frontend/src/api/hooks/useGetFolderKey/index.ts`

Currently (lines 10-40): Fetches a single folder from the API and decrypts its `encryptedSymmetricKey` using user's keypair (assumes per-user copy from old `folder_members` join).

New behavior: Two decryption paths based on workspace role.

**Admin/owner path**: Decrypt `folder.encryptedSymmetricKey` (admin master copy) using workspace admin private key.

**Member path**: The folder's key must be resolved via ACL chain. This requires knowing the folder's ancestors and having an ACL entry somewhere in the chain.

Updated implementation:

```ts
import { useCallback } from "react";
import type { IGetFolderResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";

const cache = new Map<string, Promise<string>>();

export const useGetFolderKey = () => {
  const { workspace, keyPair } = useAuth();

  const getFolderKey = useCallback(
    (folderId: string): Promise<string> => {
      const cacheKey = `${workspace!.id}:${folderId}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const promise = (async () => {
        const { data } = await axios.get<IGetFolderResponse>(
          `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}/${folderId}`,
        );

        // Admin/owner path: decrypt admin master copy
        if (workspace!.encryptedAdminPrivateKey) {
          const adminPrivateKey = await AsymmetricCrypto.decrypt(
            workspace!.encryptedAdminPrivateKey,
            keyPair!.publicKey,
            keyPair!.privateKey,
          );

          return AsymmetricCrypto.decrypt(
            data.folder.encryptedSymmetricKey,
            workspace!.adminPublicKey,
            adminPrivateKey,
          );
        }

        // Member path: need ACL chain traversal
        // For single-folder fetch, this is a simplified path.
        // Full tree resolution uses KeyChainResolver.
        // Here we attempt direct ACL decrypt -- if the member has
        // an ACL entry for this specific folder, the backend could
        // return it. For now, throw -- Phase 3 / sharing will
        // establish the member flow with full tree data.
        throw new Error("Member folder key resolution requires full tree context");
      })();

      promise.catch(() => cache.delete(cacheKey));
      cache.set(cacheKey, promise);

      return promise;
    },
    [workspace, keyPair],
  );

  return { getFolderKey };
};
```

Note: The member path for single-folder fetch is intentionally limited in this phase. Members currently don't exist in the system (only owner). The full member path will use `KeyChainResolver` with `getAllFolders` data. The `useGetFolderKey` hook is primarily used by admin/owner for day-to-day operations.

### 4. Update `useDecryptFolder` -- `packages/frontend/src/api/hooks/useDecryptFolder/index.ts`

Currently (lines 7-36): Decrypts `folder.encryptedSymmetricKey` using user keypair (per-user copy).

New behavior: Admin/owner decrypts via admin key. The key resolution is cached to avoid redundant decryption of the workspace admin private key.

```ts
import type { Folder } from "@tayemno/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import type { ILocalFolder } from "../../../types/local";
import { useCallback, useRef } from "react";

export const useDecryptFolder = () => {
  const { keyPair, workspace } = useAuth();
  const adminKeyRef = useRef<Promise<string> | null>(null);

  const getAdminPrivateKey = useCallback((): Promise<string> => {
    if (!adminKeyRef.current) {
      adminKeyRef.current = AsymmetricCrypto.decrypt(
        workspace!.encryptedAdminPrivateKey!,
        keyPair!.publicKey,
        keyPair!.privateKey,
      );
    }
    return adminKeyRef.current;
  }, [workspace, keyPair]);

  const decrypt = async (folder: Folder): Promise<ILocalFolder> => {
    if (!keyPair || !workspace) throw new Error("Not authenticated");

    let folderKey: string;

    if (workspace.encryptedAdminPrivateKey) {
      // Admin/owner: decrypt admin master copy
      const adminPrivateKey = await getAdminPrivateKey();
      folderKey = await AsymmetricCrypto.decrypt(
        folder.encryptedSymmetricKey,
        workspace.adminPublicKey,
        adminPrivateKey,
      );
    } else {
      // Member: would need ACL chain -- not yet supported in per-folder decrypt
      throw new Error("Member folder decryption requires full tree context");
    }

    const name = await SymmetricCrypto.decrypt(
      { nonce: folder.nameNonce, ciphertext: folder.encryptedName },
      folderKey,
    );

    return {
      id: folder.id,
      parentFolderId: folder.parentFolderId,
      workspaceId: folder.workspaceId,
      name,
      symmetricKey: folderKey,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  };

  return { decrypt };
};
```

The admin private key is cached in a ref to avoid decrypting it repeatedly when processing a list of folders.

### 5. Update `useDecryptVault` -- `packages/frontend/src/api/hooks/useDecryptVault/index.ts`

Minimal change. The vault decryption logic itself doesn't change (still uses `SymmetricCrypto.decrypt` for folder vaults, `AsymmetricCrypto.decrypt` for standalone). The only change is that `useGetFolderKey` (step 3) now uses the admin key path. Since `useDecryptVault` calls `useGetFolderKey`, it inherits the new behavior automatically.

Verify that the code at lines 66-74 still works:
```ts
const folderSecret = await getFolderKey(vault.folderId);
const symmetricKey = await SymmetricCrypto.decrypt(
  { nonce: vault.symmetricKeyNonce!, ciphertext: vault.encryptedSymmetricKey },
  folderSecret,
);
```

This should still work -- the folder key is the same value regardless of how it was decrypted (admin path vs. old per-user path). No code change needed in this file.

### 6. Update folder creation in `AddNewEntity` -- `packages/frontend/src/components/files/AddNewEntity/index.tsx`

Currently (lines 41-66): Creates folder with admin copy + user copy. No parent-child wrapping.

New behavior: Creates folder with admin copy + ACL entry + parent-child wrapped key.

Before (lines 41-66):
```ts
const handleCreateFolder = async (name: string) => {
  if (!workspace || !user || !keyPair) return;

  const folderKey = await SymmetricCrypto.generateKey();
  const adminEncryptedKey = await AsymmetricCrypto.encrypt(
    folderKey,
    workspace.adminPublicKey,
  );
  const memberEncryptedKey = await AsymmetricCrypto.encrypt(
    folderKey,
    user.publicKey,
  );

  const encrypted = await SymmetricCrypto.encrypt(name, folderKey);

  await createFolder.mutateAsync({
    encryptedName: encrypted.ciphertext,
    nameNonce: encrypted.nonce,
    encryptedSymmetricKey: adminEncryptedKey,
    memberEncryptedSymmetricKey: memberEncryptedKey,
    parentFolderId: props.folderId,
  });

  queryClient.invalidateQueries({
    queryKey: [QueryKeyEnum.FOLDERS, workspace.id, props.folderId],
  });
};
```

After:
```ts
const handleCreateFolder = async (name: string) => {
  if (!workspace || !user || !keyPair) return;

  const folderKey = await SymmetricCrypto.generateKey();
  const adminEncryptedKey = await AsymmetricCrypto.encrypt(
    folderKey,
    workspace.adminPublicKey,
  );
  const aclEncryptedKey = await AsymmetricCrypto.encrypt(
    folderKey,
    user.publicKey,
  );

  let wrappedKey: string | null = null;
  let wrappedKeyNonce: string | null = null;

  if (props.folderId) {
    const parentKey = await getFolderKey(props.folderId);
    const wrapped = await KeyWrapping.wrapWithParent(folderKey, parentKey);
    wrappedKey = wrapped.wrappedKey;
    wrappedKeyNonce = wrapped.wrappedKeyNonce;
  }

  const encrypted = await SymmetricCrypto.encrypt(name, folderKey);

  await createFolder.mutateAsync({
    encryptedName: encrypted.ciphertext,
    nameNonce: encrypted.nonce,
    encryptedSymmetricKey: adminEncryptedKey,
    wrappedKey,
    wrappedKeyNonce,
    aclEncryptedFolderKey: aclEncryptedKey,
    parentFolderId: props.folderId,
  });

  queryClient.invalidateQueries({
    queryKey: [QueryKeyEnum.FOLDERS, workspace.id, props.folderId],
  });
};
```

Add imports:
```ts
import { KeyWrapping } from "../../../utils/crypto/KeyWrapping";
import { useGetFolderKey } from "../../../api/hooks/useGetFolderKey";
```

Add `const { getFolderKey } = useGetFolderKey();` inside the component.

### 7. Update folder creation in `UploadContext` -- `packages/frontend/src/contexts/UploadContext/index.tsx`

The `processFolder` function (lines 307-374) creates folders during folder upload. Same changes as step 6.

Before (lines 315-337):
```ts
const folderKey = await SymmetricCrypto.generateKey();
const adminEncryptedKey = await AsymmetricCrypto.encrypt(
  folderKey,
  workspace!.adminPublicKey,
);
const memberEncryptedKey = await AsymmetricCrypto.encrypt(
  folderKey,
  user!.publicKey,
);
const encryptedName = await SymmetricCrypto.encrypt(
  node.name,
  folderKey,
);

const { data: folderResult } = await axios.post<ICreateFolderResponse>(
  `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders`,
  {
    encryptedName: encryptedName.ciphertext,
    nameNonce: encryptedName.nonce,
    encryptedSymmetricKey: adminEncryptedKey,
    memberEncryptedSymmetricKey: memberEncryptedKey,
    parentFolderId: parentId,
  } satisfies ICreateFolderRequest,
);
```

After:
```ts
const folderKey = await SymmetricCrypto.generateKey();
const adminEncryptedKey = await AsymmetricCrypto.encrypt(
  folderKey,
  workspace!.adminPublicKey,
);
const aclEncryptedKey = await AsymmetricCrypto.encrypt(
  folderKey,
  user!.publicKey,
);

let wrappedKey: string | null = null;
let wrappedKeyNonce: string | null = null;

if (parentId) {
  const parentKey = await getFolderKey(parentId);
  const wrapped = await KeyWrapping.wrapWithParent(folderKey, parentKey);
  wrappedKey = wrapped.wrappedKey;
  wrappedKeyNonce = wrapped.wrappedKeyNonce;
}

const encryptedName = await SymmetricCrypto.encrypt(
  node.name,
  folderKey,
);

const { data: folderResult } = await axios.post<ICreateFolderResponse>(
  `${EndpointEnum.WORKSPACES}/${workspace!.id}/folders`,
  {
    encryptedName: encryptedName.ciphertext,
    nameNonce: encryptedName.nonce,
    encryptedSymmetricKey: adminEncryptedKey,
    wrappedKey,
    wrappedKeyNonce,
    aclEncryptedFolderKey: aclEncryptedKey,
    parentFolderId: parentId,
  } satisfies ICreateFolderRequest,
);
```

Add import for `KeyWrapping` at the top of the file.

Note: For the nested `processFolder` calls during folder upload, the parent folder key may not be in the `useGetFolderKey` cache yet (the parent was just created). The `processFolder` function already has the `folderKey` for the folder it just created. Pass it down to children.

Modify `processFolder` to accept `parentKey: string | null` as a parameter:

```ts
const processFolder = async (
  node: IFolderNode,
  parentId: string | null,
  parentKey: string | null,
) => {
  // ... use parentKey for wrapping instead of getFolderKey(parentId)
  let wrappedKey: string | null = null;
  let wrappedKeyNonce: string | null = null;

  if (parentKey) {
    const wrapped = await KeyWrapping.wrapWithParent(folderKey, parentKey);
    wrappedKey = wrapped.wrappedKey;
    wrappedKeyNonce = wrapped.wrappedKeyNonce;
  }

  // ... after creating the folder, recurse with folderKey as parentKey:
  for (const child of node.children) {
    await processFolder(child, folderId, folderKey);
  }
};
```

Initial call changes from `processFolder(tree, parentFolderId)` to:

```ts
const parentKey = parentFolderId ? await getFolderKey(parentFolderId) : null;
await processFolder(tree, parentFolderId, parentKey);
```

### 8. Update `useFolders` -- `packages/frontend/src/api/hooks/useFolders/index.ts`

The `Folder` type now has `wrappedKey` and `wrappedKeyNonce` fields. `useDecryptFolder` handles the decryption. No change needed in `useFolders` itself -- it calls `decrypt` which is updated in step 4.

Verify that the query function at lines 26-34 still works with the updated `Folder` type and `decrypt` function. It should, since `decrypt` accepts `Folder` and returns `ILocalFolder`.

No code change needed.

### 9. Update `useBreadcrumbs` -- `packages/frontend/src/api/hooks/useBreadcrumbs/index.ts`

Read this file first. It calls `useDecryptFolder().decrypt` on each breadcrumb folder. Since `useDecryptFolder` is updated in step 4, breadcrumbs will use the new admin key path automatically.

Verify -- likely no code change needed.

### 10. Update `DownloadContext` -- `packages/frontend/src/contexts/DownloadContext/index.tsx`

Uses `useDecryptFolder` (line 55) and `useDecryptVault` (line 56). Both are updated in steps 4 and 5. The `downloadFolder` function (lines 127-342) recursively fetches children using `useFolders`-style API calls and decrypts them.

Verify the `fetchFolderContents` inner function (lines 153-177) still works. It calls `decryptFolder` and `decryptVault` which are updated. Should work automatically.

No code change needed.

## Verification

```bash
# Frontend must build
npm run build -w packages/frontend

# TypeScript check
npx tsc --noEmit -p packages/frontend/tsconfig.json
```

Check `git diff --stat` -- only these paths should appear:

**New:**
- `packages/frontend/src/utils/crypto/KeyWrapping/index.ts`
- `packages/frontend/src/utils/crypto/KeyChainResolver/index.ts`

**Modified:**
- `packages/frontend/src/api/hooks/useGetFolderKey/index.ts`
- `packages/frontend/src/api/hooks/useDecryptFolder/index.ts`
- `packages/frontend/src/components/files/AddNewEntity/index.tsx`
- `packages/frontend/src/contexts/UploadContext/index.tsx`

**Possibly modified (verify):**
- `packages/frontend/src/api/hooks/useDecryptVault/index.ts` (only if changes needed)
- `packages/frontend/src/api/hooks/useBreadcrumbs/index.ts` (only if changes needed)
- `packages/frontend/src/contexts/DownloadContext/index.tsx` (only if changes needed)

Nothing in `packages/backend/` should appear.
