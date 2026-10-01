# Phase 2 — Frontend: Move Vault UI

**Size:** 1 new component (`MoveVaultModal`), 2 new hooks (`useMoveVault`, `useGetFolderTree`), edits to `VaultListItem`, `en.json`, `EndpointEnum`, `QueryKeyEnum`. Don't add validation schemas, utility helpers, or abstractions beyond what's listed here.

## Why this approach is sufficient

The crypto logic (decrypt old key → re-encrypt for new destination) combines two existing patterns verbatim: `decryptVaultKey` from `useDownloadVault` and `buildVaultEncryptionKey` from `useUploadVault`. The modal follows the `DeleteFolderModal` pattern. The TreeSelect data comes from a single `useGetFolderTree` query. No new state management, no new context providers — just hooks, a modal, and wiring.

---

## Step 1 — Add enum values

**File:** `packages/frontend/src/enums/api/EndpointEnum/index.ts`

Add to the enum (existing values end at line 10):
```typescript
  FOLDER_TREE = "/workspaces/{workspaceId}/folders/tree",
```

Note: The `{workspaceId}` placeholder will be replaced at call site, matching how `WORKSPACES` is used with string interpolation in existing hooks (see `useGetFolders/index.ts:20`). **Alternative:** just use template literal at call site like other folder hooks do: `` `${EndpointEnum.WORKSPACES}/${workspace.id}/folders/tree` ``. Check which approach sibling hooks use and follow that. If siblings use string interpolation with `EndpointEnum.WORKSPACES`, do the same and skip adding a new enum value for the tree endpoint.

**File:** `packages/frontend/src/enums/api/QueryKeyEnum/index.ts`

Add to the enum:
```typescript
  FOLDER_TREE = "folderTree",
```

---

## Step 2 — Create `useGetFolderTree` hook

**New file:** `packages/frontend/src/api/hooks/useGetFolderTree/index.ts`

Follow the pattern from `useGetFolders/index.ts`:

```typescript
import type { IGetFolderTreeResponse } from "@tayemno/shared";

import { useApiGet } from "../useApiGet";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useGetFolderTree = (enabled: boolean) => {
  const { workspace } = useAuth();

  const query = useApiGet<IGetFolderTreeResponse>(
    [QueryKeyEnum.FOLDER_TREE],
    `${EndpointEnum.WORKSPACES}/${workspace?.id}/folders/tree`,
    { enabled: enabled && !!workspace },
  );

  return { ...query, data: query.data?.folders ?? [] };
};
```

The `enabled` parameter controls when the query fires — it should only fetch when the user clicks "Move".

---

## Step 3 — Create `useMoveVault` hook

**New file:** `packages/frontend/src/api/hooks/useMoveVault/index.ts`

This hook handles:
1. Fetching the folder tree (delegates to `useGetFolderTree`)
2. Decrypting the vault symmetric key from its current context
3. Re-encrypting it for the destination context
4. Calling `PATCH /vaults/:vaultId/move`

```typescript
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Vault, IMoveVaultRequest, IMoveVaultResponse } from "@tayemno/shared";

import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { getFolderKey } from "../../../services/folderKeyService";

export const useMoveVault = () => {
  const { keyPair, workspace, user } = useAuth();
  const queryClient = useQueryClient();
  const [isMoving, setIsMoving] = useState(false);

  const decryptVaultKey = async (vault: Vault): Promise<string> => {
    if (!keyPair || !workspace || !user) {
      throw new Error("Not authenticated");
    }

    if (vault.folderId && vault.symmetricKeyNonce) {
      const folderKey = await getFolderKey(
        vault.folderId,
        workspace.id,
        user.publicKey,
        keyPair.privateKey,
      );

      return SymmetricCrypto.decrypt(
        { nonce: vault.symmetricKeyNonce, ciphertext: vault.encryptedSymmetricKey },
        folderKey,
      );
    }

    const memberPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedMemberPrivateKey,
      user.publicKey,
      keyPair.privateKey,
    );

    return AsymmetricCrypto.decrypt(
      vault.encryptedSymmetricKey,
      workspace.memberPublicKey,
      memberPrivateKey,
    );
  };

  const encryptVaultKey = async (
    vaultKey: string,
    targetFolderId: string | null,
  ): Promise<{ encryptedSymmetricKey: string; symmetricKeyNonce: string | null }> => {
    if (!keyPair || !workspace || !user) {
      throw new Error("Not authenticated");
    }

    if (targetFolderId) {
      const folderKey = await getFolderKey(
        targetFolderId,
        workspace.id,
        user.publicKey,
        keyPair.privateKey,
      );

      const encrypted = await SymmetricCrypto.encrypt(vaultKey, folderKey);

      return {
        encryptedSymmetricKey: encrypted.ciphertext,
        symmetricKeyNonce: encrypted.nonce,
      };
    }

    const encryptedSymmetricKey = await AsymmetricCrypto.encrypt(
      vaultKey,
      workspace.memberPublicKey,
    );

    return { encryptedSymmetricKey, symmetricKeyNonce: null };
  };

  const move = async (vault: Vault, targetFolderId: string | null) => {
    if (!keyPair || !workspace || !user) return;

    setIsMoving(true);

    try {
      const vaultKey = await decryptVaultKey(vault);
      const { encryptedSymmetricKey, symmetricKeyNonce } =
        await encryptVaultKey(vaultKey, targetFolderId);

      const body: IMoveVaultRequest = {
        targetFolderId,
        encryptedSymmetricKey,
        symmetricKeyNonce,
      };

      await axios.patch<IMoveVaultResponse>(
        `${EndpointEnum.VAULTS}/${vault.id}/move`,
        body,
      );

      queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.VAULTS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDER_SIZE] });
      queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.FOLDER_TREE] });
    } finally {
      setIsMoving(false);
    }
  };

  return { move, isMoving };
};
```

---

## Step 4 — Add i18n keys

**File:** `packages/frontend/src/i18n/locales/en.json`

Add inside the `"files"` object, after `"actions"` (line 159):

```json
"moveVault": {
  "title": "Move file",
  "description": "Everyone who has access to the current folder will lose access to this file.",
  "selectLabel": "Destination folder",
  "selectPlaceholder": "Select folder",
  "rootFolder": "Files",
  "cancel": "Cancel",
  "submit": "Move"
},
```

Also add to `"files.actions"` (after line 158):

```json
"move": "Move",
```

---

## Step 5 — Create `MoveVaultModal` component

**New file:** `packages/frontend/src/components/files/MoveVaultModal/index.tsx`

Follow the `DeleteFolderModal` pattern (same imports structure, `IProps` interface, Modal + Stack + Group layout).

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TreeSelect } from "@mantine/core";
import type { IFolderTreeNode } from "@tayemno/shared";

import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Stack } from "../../ui/Stack";
import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { TextColorEnum } from "../../../enums/ui/TextColorEnum";

interface IProps {
  opened: boolean;
  currentFolderId: string | null;
  folderTree: IFolderTreeNode[];
  isMoving: boolean;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => void;
}

const buildTreeData = (
  folders: IFolderTreeNode[],
  currentFolderId: string | null,
  rootLabel: string,
) => {
  const mapNode = (node: IFolderTreeNode): {
    value: string;
    label: string;
    disabled?: boolean;
    children?: ReturnType<typeof mapNode>[];
  } => ({
    value: node.id,
    label: node.name,
    disabled: node.id === currentFolderId,
    children: node.children.length > 0
      ? node.children.map(mapNode)
      : undefined,
  });

  return [
    {
      value: "root",
      label: rootLabel,
      disabled: currentFolderId === null,
      children: folders.map(mapNode),
    },
  ];
};

export const MoveVaultModal = ({
  opened,
  currentFolderId,
  folderTree,
  isMoving,
  onClose,
  onConfirm,
}: IProps) => {
  const { t } = useTranslation();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const treeData = buildTreeData(
    folderTree,
    currentFolderId,
    t("files.moveVault.rootFolder"),
  );

  const handleClose = () => {
    setSelectedFolder(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedFolder) return;

    const targetFolderId = selectedFolder === "root" ? null : selectedFolder;
    onConfirm(targetFolderId);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("files.moveVault.title")}
    >
      <Stack>
        <Text size="sm" c={TextColorEnum.TERTIARY}>
          {t("files.moveVault.description")}
        </Text>
        <TreeSelect
          label={t("files.moveVault.selectLabel")}
          placeholder={t("files.moveVault.selectPlaceholder")}
          data={treeData}
          value={selectedFolder}
          onChange={setSelectedFolder}
        />
        <Group justify="space-between">
          <Button variant="default" onClick={handleClose}>
            {t("files.moveVault.cancel")}
          </Button>
          <Button
            loading={isMoving}
            disabled={!selectedFolder}
            onClick={handleConfirm}
          >
            {t("files.moveVault.submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
```

**Important:** Verify at implementation time that Mantine 7.15's `TreeSelect` accepts `disabled` on individual nodes. If not, use `renderNode` prop to apply `pointer-events: none` + muted style to the current folder node. Check Mantine docs before implementing.

---

## Step 6 — Update `VaultListItem`

**File:** `packages/frontend/src/components/files/VaultListItem/index.tsx`

This is the main wiring step. Changes:

1. Add imports for `useDisclosure`, `IconArrowsExchange` (or `IconFolderSymlink` — pick whichever Tabler icon fits "move"), `MoveVaultModal`, `useGetFolderTree`, `useMoveVault`
2. Add hook calls and modal state
3. Add "Move" menu item
4. Extend loading state
5. Render `MoveVaultModal` after `FileListItem`

Updated component:

```typescript
import { useTranslation } from "react-i18next";
import { useDisclosure } from "@mantine/hooks";
import { Menu } from "@mantine/core";
import {
  IconDotsVertical,
  IconDownload,
  IconFolderSymlink,
  IconTrash,
} from "@tabler/icons-react";
import type { Vault } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";
import { MoveVaultModal } from "../MoveVaultModal";
import { ActionIcon } from "../../ui/ActionIcon";
import { useDownloadVault } from "../../../api/hooks/useDownloadVault";
import { useDeleteVault } from "../../../api/hooks/useDeleteVault";
import { useMoveVault } from "../../../api/hooks/useMoveVault";
import { useGetFolderTree } from "../../../api/hooks/useGetFolderTree";

interface IProps {
  vault: Vault;
}

export const VaultListItem = ({ vault }: IProps) => {
  const { t } = useTranslation();
  const { download, isDownloading } = useDownloadVault();
  const { deleteVault, isDeleting } = useDeleteVault(vault.id);
  const { move, isMoving } = useMoveVault();
  const [moveModalOpened, { open: openMoveModal, close: closeMoveModal }] =
    useDisclosure();
  const { data: folderTree, isLoading: isLoadingTree } = useGetFolderTree(
    moveModalOpened,
  );

  const handleMove = async (targetFolderId: string | null) => {
    await move(vault, targetFolderId);
    closeMoveModal();
  };

  return (
    <>
      <FileListItem
        name={vault.name}
        isFolder={false}
        sizeBytes={vault.sizeBytes}
        encryptedSizeBytes={vault.encryptedSizeBytes}
        updatedAt={vault.updatedAt}
        onClick={() => {}}
        actions={
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                loading={isDownloading || isDeleting || isLoadingTree}
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconDownload size={16} />}
                onClick={() => download(vault)}
              >
                {t("files.actions.download")}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconFolderSymlink size={16} />}
                onClick={openMoveModal}
              >
                {t("files.actions.move")}
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() => deleteVault()}
              >
                {t("files.actions.delete")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />
      <MoveVaultModal
        opened={moveModalOpened}
        currentFolderId={vault.folderId}
        folderTree={folderTree}
        isMoving={isMoving}
        onClose={closeMoveModal}
        onConfirm={handleMove}
      />
    </>
  );
};
```

**Note on loading behavior:** The user requested that clicking "Move" shows a spinner on the ActionIcon while the tree loads. With the approach above, `useGetFolderTree(moveModalOpened)` fires when `moveModalOpened` becomes true. However, `useDisclosure` sets state synchronously, so `openMoveModal` sets `moveModalOpened = true` → triggers the query → `isLoadingTree` becomes true → ActionIcon shows spinner. The modal also opens immediately since `moveModalOpened` is true. If the user prefers the modal to open ONLY after the tree loads, add a `useEffect` that opens the modal when `isLoadingTree` transitions from true to false. Check with the user if this matters — but the simpler approach (modal opens immediately, TreeSelect shows internal loading) is likely fine since TreeSelect handles empty data gracefully.

**Alternative approach for loading-then-open:** If the user wants the ActionIcon to spin and the modal to open only after data arrives:
1. Use a separate boolean `shouldFetchTree` instead of `moveModalOpened` for the `enabled` param
2. On "Move" click: set `shouldFetchTree = true`
3. In a `useEffect`: when `!isLoadingTree && shouldFetchTree && folderTree.length >= 0`, call `openMoveModal()`
4. On modal close: set `shouldFetchTree = false`

This is a UX decision — implement whichever approach the user prefers during this phase. Ask if unclear.
