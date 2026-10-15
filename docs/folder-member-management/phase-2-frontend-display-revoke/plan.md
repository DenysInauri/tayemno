# Phase 2: Frontend — Display Folder Members & Revoke Access

**Size**: 1 new API hook, 1 new QueryKeyEnum value, 1 new EndpointEnum value, ~5 new component files, 1 modified component (AsideContent), i18n additions. All under 120 lines per file.

**Why this approach is sufficient**: The `UsersPage` + `UsersTable` + `MemberRowActions` pattern already solves the same problem (list members, search, 3-dot menu actions). This phase replicates that pattern at smaller scale inside the aside panel. No new architectural concepts needed.

## Steps

### 1. Add `FOLDER_MEMBERS` to QueryKeyEnum

**File**: `packages/frontend/src/enums/api/QueryKeyEnum/index.ts`

Add `FOLDER_MEMBERS = "folderMembers"` to the enum.

### 2. Add `FOLDER_MEMBERS` to EndpointEnum

**File**: `packages/frontend/src/enums/api/EndpointEnum/index.ts`

Add `FOLDER_MEMBERS = "/members"` to the enum. The full URL will be constructed as `WORKSPACES/{id}/FOLDERS/{folderId}/FOLDER_MEMBERS`.

Note: if `/members` conflicts with the existing `MEMBERS = "/members"` enum value, use a distinct name like `FOLDER_MEMBERS_PATH = "/members"` or just inline the string in the hook. Check the existing enum and pick the approach that doesn't break anything.

### 3. Create `useGetFolderMembers` API hook

**File**: `packages/frontend/src/api/hooks/useGetFolderMembers/index.ts` (new)

Copy the pattern from `useGetMembers/index.ts`:

```typescript
import type { IListFolderMembersResponse } from "@tayemno/shared";
import { useQuery } from "@tanstack/react-query";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useGetFolderMembers = (folderId: string | null) => {
  const { workspace } = useAuth();

  return useQuery<IListFolderMembersResponse>({
    queryKey: [QueryKeyEnum.FOLDER_MEMBERS, workspace?.id, folderId],
    queryFn: async () => {
      const { data } = await axios.get<IListFolderMembersResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.FOLDERS}/${folderId}/members`,
      );
      return data;
    },
    enabled: !!workspace && !!folderId,
  });
};
```

### 4. Create `useDeleteFolderAcl` API hook

**File**: `packages/frontend/src/api/hooks/useDeleteFolderAcl/index.ts` (new)

```typescript
import type { IDeleteFolderAclResponse } from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useApiDelete } from "../useApiDelete";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useDeleteFolderAcl = (folderId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiDelete<IDeleteFolderAclResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.FOLDERS}/${folderId}/acl`,
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

**Important**: Check if `useApiDelete` exists. If not, check what generic mutation hooks exist (look in `packages/frontend/src/api/hooks/`). If only `useApiPost` exists, the delete hook should use `axios.delete` directly with `useMutation` from `@tanstack/react-query`. The pattern to copy is `useDeleteMembers/index.ts` — check how it handles delete operations.

### 5. Create `FolderMemberRow` component

**File**: `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMemberRow/index.tsx` (new, ~40 lines)

Simpler than `UsersPage/UsersTable/MemberRow` — only shows name, email, and 3-dot menu. Copy the `MemberRowActions` 3-dot menu pattern from `UsersPage/UsersTable/MemberRowActions/index.tsx`.

```typescript
import { Table, Menu } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconDotsVertical, IconUserMinus } from "@tabler/icons-react";
import type { IFolderMemberItem } from "@tayemno/shared";
import { ActionIcon } from "../../../../ui/ActionIcon";

interface IProps {
  member: IFolderMemberItem;
  onRevoke: (member: IFolderMemberItem) => void;
}

export const FolderMemberRow = ({ member, onRevoke }: IProps) => {
  const { t } = useTranslation();

  return (
    <Table.Tr>
      <Table.Td>{member.name}</Table.Td>
      <Table.Td>{member.email}</Table.Td>
      <Table.Td w={40}>
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              color="red"
              leftSection={<IconUserMinus size={16} />}
              onClick={() => onRevoke(member)}
            >
              {t("aside.members.actions.revoke")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  );
};
```

Note: Uses `IconUserMinus` (not `IconTrash`) as requested — the user wants an icon and title, not a trash button.

### 6. Create `FolderMembersList` component

**File**: `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/FolderMembersList/index.tsx` (new, ~70 lines)

Copy the virtualization pattern from `UsersPage/UsersTable/index.tsx`. Fixed height for 5 rows (5 * ROW_HEIGHT = 240px).

```typescript
import { useRef } from "react";
import { Table } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { IFolderMemberItem } from "@tayemno/shared";
import { FolderMemberRow } from "../FolderMemberRow";

const ROW_HEIGHT = 48;
const VISIBLE_ROWS = 5;

interface IProps {
  members: IFolderMemberItem[];
  onRevoke: (member: IFolderMemberItem) => void;
}

export const FolderMembersList = ({ members, onRevoke }: IProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems[0]?.start ?? 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div
      ref={parentRef}
      style={{
        height: ROW_HEIGHT * VISIBLE_ROWS,
        overflow: "auto",
      }}
    >
      <Table striped highlightOnHover>
        <Table.Tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop, padding: 0, border: "none" }} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => (
            <FolderMemberRow
              key={members[virtualRow.index].userId}
              member={members[virtualRow.index]}
              onRevoke={onRevoke}
            />
          ))}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom, padding: 0, border: "none" }} />
            </tr>
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
};
```

No table header — the member list is compact (name + email + actions). The fixed height `ROW_HEIGHT * VISIBLE_ROWS` = 240px ensures exactly 5 rows are visible.

### 7. Create `FolderMembersSection` component

**File**: `packages/frontend/src/components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx` (new, ~70 lines)

This is the main orchestrator. Copy the search/filter pattern from `UsersPage/index.tsx`.

```typescript
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IconSearch } from "@tabler/icons-react";
import type { IFolderMemberItem } from "@tayemno/shared";
import { TextInput } from "../../../../ui/TextInput";
import { Text } from "../../../../ui/Text";
import { Stack } from "../../../../ui/Stack";
import { Title } from "../../../../ui/Title";
import { useGetFolderMembers } from "../../../../../api/hooks/useGetFolderMembers";
import { useDeleteFolderAcl } from "../../../../../api/hooks/useDeleteFolderAcl";
import { SizeEnum } from "../../../../../enums/ui/SizeEnum";
import { FolderMembersList } from "./FolderMembersList";

interface IProps {
  folderId: string;
}

export const FolderMembersSection = ({ folderId }: IProps) => {
  const { t } = useTranslation();
  const { data } = useGetFolderMembers(folderId);
  const deleteMutation = useDeleteFolderAcl(folderId);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    if (!searchQuery) return data.members;
    const q = searchQuery.toLowerCase();
    return data.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [data?.members, searchQuery]);

  const handleRevoke = async (member: IFolderMemberItem) => {
    await deleteMutation.mutateAsync(member.userId);
  };

  return (
    <Stack gap={SizeEnum.SM}>
      <Title order={5}>{t("aside.members.title")}</Title>
      <Text size="sm" c="dimmed">
        {t("aside.members.description")}
      </Text>
      <TextInput
        placeholder={t("aside.members.search.placeholder")}
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        size="sm"
      />
      <FolderMembersList members={filteredMembers} onRevoke={handleRevoke} />
    </Stack>
  );
};
```

### 8. Update `AsideContent` to show folder members

**File**: `packages/frontend/src/components/layout/AppShell/AsideContent/index.tsx`

**Before**:
```typescript
import { AppShell as MantineAppShell } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Title } from "../../../ui/Title";
import { SizeEnum } from "../../../../enums/ui/SizeEnum";

export const AsideContent = () => {
  const { t } = useTranslation();

  return (
    <MantineAppShell.Aside p={SizeEnum.MD}>
      <MantineAppShell.Section>
        <Title order={4}>{t("aside.title")}</Title>
      </MantineAppShell.Section>
    </MantineAppShell.Aside>
  );
};
```

**After**:
```typescript
import { AppShell as MantineAppShell } from "@mantine/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Title } from "../../../ui/Title";
import { Text } from "../../../ui/Text";
import { Stack } from "../../../ui/Stack";
import { SizeEnum } from "../../../../enums/ui/SizeEnum";
import { FolderMembersSection } from "./FolderMembersSection";

export const AsideContent = () => {
  const { t } = useTranslation();
  const { folderId } = useParams<{ folderId: string }>();

  return (
    <MantineAppShell.Aside p={SizeEnum.MD}>
      <MantineAppShell.Section>
        <Stack gap={SizeEnum.MD}>
          <Title order={4}>{t("aside.title")}</Title>
          {folderId ? (
            <FolderMembersSection folderId={folderId} />
          ) : (
            <Text size="sm" c="dimmed">
              {t("aside.members.emptyRoot")}
            </Text>
          )}
        </Stack>
      </MantineAppShell.Section>
    </MantineAppShell.Aside>
  );
};
```

### 9. Add i18n keys

**File**: `packages/frontend/src/i18n/locales/en.json`

Replace the existing `"aside"` section:

**Before**:
```json
"aside": {
  "title": "Details"
},
```

**After**:
```json
"aside": {
  "title": "Details",
  "members": {
    "title": "Members",
    "description": "Users with access to this folder.",
    "emptyRoot": "Select a folder to view members.",
    "search": {
      "placeholder": "Search by name or email"
    },
    "actions": {
      "revoke": "Revoke access"
    }
  }
},
```

### 10. Verify `Text` and `Stack` UI wrappers exist

Check that these wrapper components exist before using them:
- `packages/frontend/src/components/ui/Text/index.tsx`
- `packages/frontend/src/components/ui/Stack/index.tsx`

If any are missing, create them following the wrapper pattern from `packages/frontend/src/components/ui/Title/index.tsx`.
