# Phase 3 -- Move Folder UI

**Size**: ~2 new files, ~4 modified files. Medium phase -- adds the `useMoveFolder` hook and `MoveFolderModal` component, updates `FolderListItem` context menu, and updates `useLazyFolderTree` for the new folder type.

**Why this approach is sufficient -- don't add anything beyond this**: This phase adds the move folder interaction end-to-end. It reuses the established patterns from `useMoveVault` and `MoveVaultModal`. No new crypto primitives are needed -- `KeyWrapping.wrapWithParent`/`unwrapWithParent` and the admin key path from Phase 2 are sufficient. Do NOT add folder sharing UI, ACL management modals, or any features not related to folder move.

## Steps

### 1. Create `useMoveFolder` hook -- `packages/frontend/src/api/hooks/useMoveFolder/index.ts`

New file. Pattern follows `api/hooks/useMoveVault/index.ts`.

The hook:
1. Decrypts the folder's symmetric key (using admin key path from `useGetFolderKey` or `useDecryptFolder`).
2. Re-wraps the key with the target parent's key (or sets `wrappedKey` to null if moving to root).
3. Re-encrypts the admin master copy (sealed box with admin public key -- this doesn't change since the folder key itself doesn't change, but we need to re-send it for the `encryptedSymmetricKey` field in the move request).
4. Sends PATCH to `/:folderId/move`.
5. Invalidates relevant query keys.

```ts
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { IMoveFolderRequest, IMoveFolderResponse } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { KeyWrapping } from "../../../utils/crypto/KeyWrapping";
import { useGetFolderKey } from "../useGetFolderKey";
import type { ILocalFolder } from "../../../types/local";

export const useMoveFolder = () => {
  const { keyPair, workspace } = useAuth();
  const queryClient = useQueryClient();
  const { getFolderKey } = useGetFolderKey();
  const [isMoving, setIsMoving] = useState(false);

  const move = async (folder: ILocalFolder, targetFolderId: string | null) => {
    if (!keyPair || !workspace) return;

    setIsMoving(true);

    try {
      const folderKey = folder.symmetricKey;

      // Re-wrap with new parent
      let wrappedKey: string | null = null;
      let wrappedKeyNonce: string | null = null;

      if (targetFolderId) {
        const targetKey = await getFolderKey(targetFolderId);
        const wrapped = await KeyWrapping.wrapWithParent(folderKey, targetKey);
        wrappedKey = wrapped.wrappedKey;
        wrappedKeyNonce = wrapped.wrappedKeyNonce;
      }

      // Re-encrypt admin master copy (folder key unchanged, but new sealed box)
      const encryptedSymmetricKey = await AsymmetricCrypto.encrypt(
        folderKey,
        workspace.adminPublicKey,
      );

      const body: IMoveFolderRequest = {
        newParentFolderId: targetFolderId,
        wrappedKey,
        wrappedKeyNonce,
        encryptedSymmetricKey,
      };

      await axios.patch<IMoveFolderResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace.id}${EndpointEnum.FOLDERS}/${folder.id}/move`,
        body,
      );

      // Invalidate both old and new parent folder lists
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.FOLDERS, workspace.id, folder.parentFolderId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.FOLDERS, workspace.id, targetFolderId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.FOLDER_TREE, workspace.id],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeyEnum.BREADCRUMBS, workspace.id],
      });
    } finally {
      setIsMoving(false);
    }
  };

  return { move, isMoving };
};
```

Note: The folder's symmetric key is already decrypted (available on `ILocalFolder.symmetricKey`). No need to fetch/decrypt again. The admin master copy is re-encrypted because the sealed box is non-deterministic (new random nonce each time), but the underlying folder key is the same. This is required because the `IMoveFolderRequest.encryptedSymmetricKey` field expects the admin copy for the new storage.

### 2. Create `MoveFolderModal` -- `packages/frontend/src/components/files/MoveFolderModal/index.tsx`

New file. Pattern follows `components/files/MoveVaultModal/index.tsx` closely.

The modal:
- Uses `useLazyFolderTree` (step 4) to display the folder tree.
- Lets the user select a target folder (or root).
- Disables the folder being moved and its descendants (to prevent circular moves).
- Calls `useMoveFolder().move(folder, targetFolderId)` on confirm.

Structure (copy from `MoveVaultModal/index.tsx` lines 54-180, adapting):

```ts
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconFolder, IconFolderOpen, IconChevronRight, IconHome } from "@tabler/icons-react";
import { Tree, useTree, Loader } from "@mantine/core";

import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Group } from "../../ui/Group";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { useLazyFolderTree, PLACEHOLDER_PREFIX } from "../../../api/hooks/useLazyFolderTree";
import { useMoveFolder } from "../../../api/hooks/useMoveFolder";
import type { ILocalFolder } from "../../../types/local";
import { SizeEnum } from "../../../enums/ui/SizeEnum";
```

Props interface:
```ts
interface IProps {
  folder: ILocalFolder;
  opened: boolean;
  onClose: () => void;
}
```

Key differences from `MoveVaultModal`:
- Works with `ILocalFolder` instead of `ILocalVault`.
- Disables the folder itself AND all its descendants in the tree (not just current parent).
- The "root" option moves the folder to workspace root (`targetFolderId = null`).
- Must disable selecting any descendant folder (circular move guard). To do this, track the folder's subtree: when loading tree nodes, if a node's ancestry leads back to the moved folder, disable it.

For the descendant check, the simplest approach: when building the tree for display, mark the moved folder's ID. When rendering nodes, check if the node is the folder being moved or if any of its ancestors is the folder being moved. Since the tree is built recursively, pass a `disabled` flag down when entering the moved folder's subtree.

Use existing i18n keys where possible. New i18n keys needed:
- `files.moveFolderModal.title` -- "Move folder"
- `files.moveFolderModal.moveButton` -- "Move here"

### 3. Update `FolderListItem` -- `packages/frontend/src/components/files/FolderListItem/index.tsx`

Add "Move" action to the context menu. Pattern follows the existing "Download as ZIP" and "Delete" actions.

Currently (lines 19-74): Has download and delete actions in the context menu.

Add after the download action (around line 52-53):

```tsx
// Add state and hooks at component level:
const [moveModalOpened, { open: openMoveModal, close: closeMoveModal }] = useDisclosure();

// Add menu item in the context menu:
<Menu.Item
  leftSection={<IconArrowsMove size={14} />}
  onClick={openMoveModal}
>
  {t("files.contextMenu.move")}
</Menu.Item>

// Add modal after the existing DeleteFolderModal:
<MoveFolderModal
  folder={props.folder}
  opened={moveModalOpened}
  onClose={closeMoveModal}
/>
```

Import `MoveFolderModal`, `IconArrowsMove` (or `IconFolderSymlink`), and `useDisclosure`.

### 4. Update `useLazyFolderTree` -- `packages/frontend/src/api/hooks/useLazyFolderTree/index.ts`

Currently uses `useDecryptFolder` which is updated in Phase 2 to use the admin key path. The hook should work without structural changes.

However, verify that the `Folder` type changes (new `wrappedKey`/`wrappedKeyNonce` fields) don't cause issues. The `useDecryptFolder().decrypt` function accepts a `Folder` and returns `ILocalFolder` -- the new fields are simply ignored during decryption (the admin path doesn't use them).

Likely no code change needed. Verify and move on.

### 5. Update `MoveVaultModal` (if needed)

The existing `MoveVaultModal` uses `useLazyFolderTree` which is verified in step 4. It should continue working without changes since it doesn't interact with folder key wrapping directly.

Verify -- likely no code change needed.

### 6. Add i18n keys

Add keys to the appropriate locale files in `packages/frontend/src/i18n/locales/`:

```json
{
  "files": {
    "contextMenu": {
      "move": "Move"
    },
    "moveFolderModal": {
      "title": "Move folder",
      "moveButton": "Move here"
    }
  }
}
```

Check existing i18n files for the exact structure and merge these keys. The context menu "move" key may already exist for vault move -- verify before adding.

## Verification

```bash
# Frontend must build
npm run build -w packages/frontend

# TypeScript must compile
npx tsc --noEmit -p packages/frontend/tsconfig.json
```

Check `git diff --stat` -- only these paths should appear:

**New:**
- `packages/frontend/src/api/hooks/useMoveFolder/index.ts`
- `packages/frontend/src/components/files/MoveFolderModal/index.tsx`

**Modified:**
- `packages/frontend/src/components/files/FolderListItem/index.tsx`
- `packages/frontend/src/i18n/locales/en/*.json` (or whichever locale files)

**Possibly modified (verify):**
- `packages/frontend/src/api/hooks/useLazyFolderTree/index.ts` (only if changes needed)
- `packages/frontend/src/components/files/MoveVaultModal/index.tsx` (only if changes needed)

Nothing in `packages/backend/` should appear.
