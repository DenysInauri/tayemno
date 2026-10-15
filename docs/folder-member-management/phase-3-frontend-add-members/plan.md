# Phase 3: Frontend — Add Members to Folder with Crypto

**Size**: 1 new API hook, ~4 new component/utility files, 1 modified component (FolderMembersSection), i18n additions. All under 120 lines per file.

**Why this approach is sufficient**: The crypto flow reuses existing `AsymmetricCrypto` and `SymmetricCrypto` utilities. The MultiSelect is a standard Mantine component. The folder key retrieval extends the existing `useGetFolderKeyAsMember` pattern with an admin fallback path. No new crypto primitives or complex state management needed.

## Steps

### 1. Create `useGetFolderKey` hook (admin-aware)

**File**: `packages/frontend/src/api/hooks/useGetFolderKey/index.ts` (new, ~50 lines)

The existing `useGetFolderKeyAsMember` only handles ACL and parent-wrapping paths. Admins who didn't create a folder may not have an ACL. This hook adds the admin fallback: decrypt `folder.encryptedSymmetricKey` using the workspace admin key pair.

```typescript
import { useCallback } from "react";
import type { IGetFolderResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";

export const useGetFolderKey = () => {
  const { workspace, keyPair } = useAuth();

  const getFolderKey = useCallback(
    async (folderId: string): Promise<string> => {
      const { data } = await axios.get<IGetFolderResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}/${folderId}`,
      );

      const { folder } = data;

      // Path 1: user has direct ACL
      if (folder.aclEncryptedFolderKey) {
        return AsymmetricCrypto.decrypt(
          folder.aclEncryptedFolderKey,
          keyPair!.publicKey,
          keyPair!.privateKey,
        );
      }

      // Path 2: folder is nested — decrypt via parent key
      if (folder.wrappedKey && folder.wrappedKeyNonce && folder.parentFolderId) {
        const parentKey = await getFolderKey(folder.parentFolderId);
        return SymmetricCrypto.decrypt(
          { ciphertext: folder.wrappedKey, nonce: folder.wrappedKeyNonce },
          parentKey,
        );
      }

      // Path 3: admin fallback — decrypt with workspace admin key
      if (workspace!.encryptedAdminPrivateKey) {
        const adminPrivateKey = await AsymmetricCrypto.decrypt(
          workspace!.encryptedAdminPrivateKey,
          keyPair!.publicKey,
          keyPair!.privateKey,
        );
        return AsymmetricCrypto.decrypt(
          folder.encryptedSymmetricKey,
          workspace!.adminPublicKey,
          adminPrivateKey,
        );
      }

      throw new Error("Cannot decrypt folder key");
    },
    [workspace, keyPair],
  );

  return { getFolderKey };
};
```

**Important**: Check whether `AsymmetricCrypto.decrypt` takes `(ciphertext, publicKey, privateKey)` or a different signature. Verify by reading `packages/frontend/src/utils/crypto/AsymmetricCrypto/index.ts`. Also verify the `SymmetricCrypto.decrypt` signature.

### 2. Create `usePostBulkFolderAcl` API hook

**File**: `packages/frontend/src/api/hooks/usePostBulkFolderAcl/index.ts` (new)

```typescript
import type {
  IBulkCreateFolderAclRequest,
  IBulkCreateFolderAclResponse,
} from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useApiPost } from "../useApiPost";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostBulkFolderAcl = (folderId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiPost<IBulkCreateFolderAclRequest, IBulkCreateFolderAclResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.FOLDERS}/${folderId}/acl/bulk`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [QueryKeyEnum.FOLDER_MEMBERS, workspace?.id, folderId],
        });
      },
    },
  );
};
```

### 3. Create `buildAddMembersPayload` utility

**File**: `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/buildAddMembersPayload/index.ts` (new)

This pure function encrypts the folder key for each selected user.

```typescript
import type { IBulkCreateFolderAclRequest, IMemberItem } from "@tayemno/shared";
import { AsymmetricCrypto } from "../../../../../../utils/crypto/AsymmetricCrypto";

interface IParams {
  selectedMembers: IMemberItem[];
  folderKey: string;
}

export const buildAddMembersPayload = async ({
  selectedMembers,
  folderKey,
}: IParams): Promise<IBulkCreateFolderAclRequest> => {
  const acls = await Promise.all(
    selectedMembers.map(async (member) => ({
      userId: member.userId,
      encryptedFolderKey: await AsymmetricCrypto.encrypt(
        folderKey,
        member.publicKey,
      ),
    })),
  );

  return { acls };
};
```

### 4. Create `AddMemberSelect` component

**File**: `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/AddMemberSelect/index.tsx` (new, ~90 lines)

Uses Mantine `MultiSelect` to pick workspace members. Already-added members are disabled.

```typescript
import { useState, useMemo } from "react";
import { MultiSelect } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconPlus } from "@tabler/icons-react";
import type { IFolderMemberItem, IMemberItem } from "@tayemno/shared";
import { Button } from "../../../../../ui/Button";
import { Group } from "../../../../../ui/Group";
import { Stack } from "../../../../../ui/Stack";
import { useGetMembers } from "../../../../../../api/hooks/useGetMembers";
import { SizeEnum } from "../../../../../../enums/ui/SizeEnum";

interface IProps {
  folderMembers: IFolderMemberItem[];
  isSubmitting: boolean;
  onAdd: (members: IMemberItem[]) => void;
  onCancel: () => void;
}

export const AddMemberSelect = ({
  folderMembers,
  isSubmitting,
  onAdd,
  onCancel,
}: IProps) => {
  const { t } = useTranslation();
  const { data: membersResponse } = useGetMembers();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const existingUserIds = useMemo(
    () => new Set(folderMembers.map((m) => m.userId)),
    [folderMembers],
  );

  const options = useMemo(() => {
    if (!membersResponse?.members) return [];
    return membersResponse.members.map((m) => ({
      value: m.userId,
      label: `${m.name} (${m.email})`,
      disabled: existingUserIds.has(m.userId),
    }));
  }, [membersResponse?.members, existingUserIds]);

  const handleSubmit = () => {
    if (!membersResponse?.members) return;
    const selected = membersResponse.members.filter((m) =>
      selectedIds.includes(m.userId),
    );
    onAdd(selected);
  };

  return (
    <Stack gap={SizeEnum.SM}>
      <MultiSelect
        data={options}
        value={selectedIds}
        onChange={setSelectedIds}
        placeholder={t("aside.members.add.placeholder")}
        searchable
        size="sm"
      />
      <Group gap={SizeEnum.SM} justify="flex-end">
        <Button variant="default" size="sm" onClick={onCancel}>
          {t("aside.members.add.cancel")}
        </Button>
        <Button
          size="sm"
          leftSection={<IconPlus size={14} />}
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={selectedIds.length === 0}
        >
          {t("aside.members.add.submit")}
        </Button>
      </Group>
    </Stack>
  );
};
```

**Important**: Check if a `MultiSelect` wrapper exists in `packages/frontend/src/components/ui/`. If not, either use `MultiSelect` directly from `@mantine/core` (acceptable since it's only used once) or create a wrapper following the pattern in `.claude/frontend/ui-guide.md`.

### 5. Modify `FolderMembersSection` to include add-member flow

**File**: `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx`

Add the "Add member" button next to the search field and the `AddMemberSelect` UI. This file will grow but should stay under 120 lines.

Key changes:
- Import `useGetFolderKey`, `usePostBulkFolderAcl`, `buildAddMembersPayload`, `AddMemberSelect`
- Add `showAddMember` boolean state (controls whether the MultiSelect is visible)
- Add `isSubmitting` boolean state
- Add "Add member" `ActionIcon` or `Button` next to search field
- When `showAddMember` is true, render `AddMemberSelect` between search and list
- The `onAdd` handler: get folder key → build payload → POST → close picker

```typescript
// Inside FolderMembersSection, add:
const { getFolderKey } = useGetFolderKey();
const bulkAddMutation = usePostBulkFolderAcl(folderId);
const [showAddMember, setShowAddMember] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);

const handleAddMembers = async (members: IMemberItem[]) => {
  setIsSubmitting(true);
  try {
    const folderKey = await getFolderKey(folderId);
    const payload = await buildAddMembersPayload({
      selectedMembers: members,
      folderKey,
    });
    await bulkAddMutation.mutateAsync(payload);
    setShowAddMember(false);
  } finally {
    setIsSubmitting(false);
  }
};
```

The search field row becomes a `Group` with the search `TextInput` and an "Add" `ActionIcon`:

```typescript
<Group gap={SizeEnum.XS}>
  <TextInput
    placeholder={t("aside.members.search.placeholder")}
    leftSection={<IconSearch size={16} />}
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.currentTarget.value)}
    size="sm"
    style={{ flex: 1 }}
  />
  <ActionIcon
    variant="default"
    size="input-sm"
    onClick={() => setShowAddMember(true)}
  >
    <IconPlus size={16} />
  </ActionIcon>
</Group>
```

If `FolderMembersSection` exceeds 120 lines after these changes, extract the add-member handler logic into a `useAddFolderMembers/index.ts` hook in the same directory.

### 6. Add i18n keys

**File**: `packages/frontend/src/i18n/locales/en.json`

Add inside `aside.members`:

```json
"add": {
  "placeholder": "Select users to add",
  "submit": "Add",
  "cancel": "Cancel"
}
```

So the full `aside.members` becomes:

```json
"members": {
  "title": "Members",
  "description": "Users with access to this folder.",
  "emptyRoot": "Select a folder to view members.",
  "search": {
    "placeholder": "Search by name or email"
  },
  "actions": {
    "revoke": "Revoke access"
  },
  "add": {
    "placeholder": "Select users to add",
    "submit": "Add",
    "cancel": "Cancel"
  }
}
```
