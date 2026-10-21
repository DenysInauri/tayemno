# Phase 2 — Frontend: Audit Log Encryption, Display, and Instrumentation

Medium phase: 2 new crypto helpers, 3 new API hooks, 1 new context, ~4 new components, edits to ~14 existing files (enums, i18n, AsideContent, VirtualizedFileTable click handlers, mutation call sites). The frontend handles all audit log business logic — encryption, decryption, deciding what to log and when. Also changes the file table interaction model: single click selects, double click opens.

**Why this approach is sufficient — don't add anything beyond this:** The backend is a dumb encrypted store (Phase 1). The frontend encrypts audit log payloads with the workspace admin public key before POSTing, and decrypts them with the admin private key when reading. Each entry is independently encrypted with a random symmetric key wrapped via sealed box. No filtering by action type, no search, no date range picker — just a chronological virtualized list with "Load more" pagination.

---

## Step 1: Add enum entries

**File:** `packages/frontend/src/enums/api/QueryKeyEnum/index.ts`

Add to the enum:

```typescript
AUDIT_LOGS = "auditLogs",
```

**File:** `packages/frontend/src/enums/api/EndpointEnum/index.ts`

Add to the enum:

```typescript
AUDIT_LOGS = "/audit-logs",
```

## Step 2: Create encryption helper

**New file:** `packages/frontend/src/utils/crypto/encryptAuditLog/index.ts`

Uses the same `SymmetricCrypto` + `AsymmetricCrypto` utilities that vaults use. Any workspace member can encrypt (admin public key is in workspace record).

```typescript
import type { IAuditLogPayload } from "@tayemno/shared";
import { SymmetricCrypto } from "../SymmetricCrypto";
import { AsymmetricCrypto } from "../AsymmetricCrypto";

interface IEncryptedAuditLog {
  encryptedPayload: string;
  payloadNonce: string;
  encryptedKey: string;
}

export const encryptAuditLog = async (
  payload: IAuditLogPayload,
  adminPublicKeyHex: string,
): Promise<IEncryptedAuditLog> => {
  const symmetricKey = await SymmetricCrypto.generateKey();
  const { ciphertext, nonce } = await SymmetricCrypto.encrypt(
    JSON.stringify(payload),
    symmetricKey,
  );
  const encryptedKey = await AsymmetricCrypto.encrypt(
    symmetricKey,
    adminPublicKeyHex,
  );
  return { encryptedPayload: ciphertext, payloadNonce: nonce, encryptedKey };
};
```

## Step 3: Create decryption helper

**New file:** `packages/frontend/src/utils/crypto/decryptAuditLog/index.ts`

Only admin/owner can decrypt (they hold the admin private key).

```typescript
import type { IAuditLogPayload } from "@tayemno/shared";
import { SymmetricCrypto } from "../SymmetricCrypto";
import { AsymmetricCrypto } from "../AsymmetricCrypto";

interface IEncryptedEntry {
  encryptedPayload: string;
  payloadNonce: string;
  encryptedKey: string;
}

export const decryptAuditLog = async (
  entry: IEncryptedEntry,
  adminPublicKeyHex: string,
  adminPrivateKeyHex: string,
): Promise<IAuditLogPayload> => {
  const symmetricKey = await AsymmetricCrypto.decrypt(
    entry.encryptedKey,
    adminPublicKeyHex,
    adminPrivateKeyHex,
  );
  const json = await SymmetricCrypto.decrypt(
    { ciphertext: entry.encryptedPayload, nonce: entry.payloadNonce },
    symmetricKey,
  );
  return JSON.parse(json);
};
```

## Step 4: Create `usePostAuditLog` hook

**New file:** `packages/frontend/src/api/hooks/usePostAuditLog/index.ts`

Fire-and-forget mutation. Errors are silently caught — audit logs must never block user operations. The hook provides a `logAction` function that encrypts the payload and POSTs it.

```typescript
import { useCallback } from "react";
import axios from "axios";
import type { AuditAction, IAuditLogPayload } from "@tayemno/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { encryptAuditLog } from "../../../utils/crypto/encryptAuditLog";

interface ILogActionParams {
  folderId: string | null;
  vaultId?: string | null;
  action: AuditAction;
  context?: IAuditLogPayload["context"];
}

export const usePostAuditLog = () => {
  const { workspace, user } = useAuth();

  const logAction = useCallback(
    async (params: ILogActionParams) => {
      if (!workspace || !user) return;
      try {
        const payload: IAuditLogPayload = {
          action: params.action,
          actorName: user.name,
          actorEmail: user.email,
          context: params.context,
        };
        const encrypted = await encryptAuditLog(
          payload,
          workspace.adminPublicKey,
        );
        await axios.post(
          `${EndpointEnum.WORKSPACES}/${workspace.id}${EndpointEnum.AUDIT_LOGS}`,
          {
            folderId: params.folderId,
            vaultId: params.vaultId ?? null,
            ...encrypted,
          },
        );
      } catch {
        // Silently ignore — audit logs must not block user operations
      }
    },
    [workspace, user],
  );

  return { logAction };
};
```

Key details:
- `user.name` and `user.email` come from `useAuth()` — verify this provides the `user` object with these fields by reading `contexts/AuthContext/index.tsx`.
- The `try/catch` swallows all errors. This is intentional.
- `useCallback` prevents unnecessary re-renders in components that consume this hook.

## Step 5: Create `useGetAuditLogs` hook

**New file:** `packages/frontend/src/api/hooks/useGetAuditLogs/index.ts`

Uses `useInfiniteQuery` from `@tanstack/react-query` for cursor-based pagination. This is a new pattern for this codebase — the existing hooks use `useQuery`, but `useInfiniteQuery` is the standard React Query approach for paginated lists.

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import type { IGetAuditLogsResponse } from "@tayemno/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

export const useGetAuditLogs = (
  folderId: string | null | undefined,
  vaultId: string | null | undefined,
) => {
  const { workspace } = useAuth();

  return useInfiniteQuery<IGetAuditLogsResponse>({
    queryKey: [QueryKeyEnum.AUDIT_LOGS, workspace?.id, folderId, vaultId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (vaultId) params.set("vaultId", vaultId);
      else if (folderId) params.set("folderId", folderId);
      if (pageParam) params.set("cursor", pageParam as string);
      params.set("limit", "50");

      const { data } = await axios.get<IGetAuditLogsResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.AUDIT_LOGS}?${params}`,
      );
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!workspace,
    initialPageParam: undefined as string | undefined,
  });
};
```

## Step 6: Create `useDecryptAuditLogs` hook

**New file:** `packages/frontend/src/api/hooks/useDecryptAuditLogs/index.ts`

Decrypts all audit log entries from the infinite query pages. Caches decrypted results by entry ID to avoid re-decrypting on re-renders.

The admin private key derivation follows the exact pattern from `useGetFolderKeyAsAdmin/index.ts` lines 24-33 — read that file first and replicate the key derivation logic (decrypt `workspace.encryptedAdminPrivateKey` using the user's keypair).

```typescript
import { useState, useEffect, useRef } from "react";
import type { IAuditLogEntry, IAuditLogPayload } from "@tayemno/shared";
import { useAuth } from "../../../contexts/AuthContext";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { decryptAuditLog } from "../../../utils/crypto/decryptAuditLog";

// ⚠️ The implementing session must verify how to get the user's keypair.
// Read useGetFolderKeyAsAdmin/index.ts to see how it accesses the keypair
// and decrypts workspace.encryptedAdminPrivateKey. Replicate that pattern.

export const useDecryptAuditLogs = (entries: IAuditLogEntry[]) => {
  const { workspace } = useAuth();
  // Get user keypair — follow useGetFolderKeyAsAdmin pattern
  const [decryptedMap, setDecryptedMap] = useState<
    Map<string, IAuditLogPayload>
  >(new Map());
  const processingRef = useRef(new Set<string>());

  useEffect(() => {
    if (!entries.length || !workspace?.encryptedAdminPrivateKey) return;

    const decryptNew = async () => {
      const newEntries = entries.filter(
        (e) => !decryptedMap.has(e.id) && !processingRef.current.has(e.id),
      );
      if (!newEntries.length) return;

      newEntries.forEach((e) => processingRef.current.add(e.id));

      // Decrypt admin private key (same as useGetFolderKeyAsAdmin lines 24-33)
      // const adminPrivateKey = await AsymmetricCrypto.decrypt(
      //   workspace.encryptedAdminPrivateKey,
      //   keyPair.publicKey, keyPair.privateKey,
      // );

      const results = await Promise.all(
        newEntries.map(async (entry) => {
          const payload = await decryptAuditLog(
            entry,
            workspace.adminPublicKey,
            adminPrivateKey, // from above
          );
          return { id: entry.id, payload };
        }),
      );

      setDecryptedMap((prev) => {
        const next = new Map(prev);
        results.forEach((r) => next.set(r.id, r.payload));
        return next;
      });
    };

    decryptNew();
  }, [entries, workspace]);

  return { decryptedMap };
};
```

**IMPORTANT**: The pseudocode above has a placeholder for admin private key derivation. The implementing session MUST read `useGetFolderKeyAsAdmin/index.ts` and replicate the exact pattern for getting the user's keypair and decrypting `workspace.encryptedAdminPrivateKey`. This is the critical crypto step — do not guess.

## Step 7: Create `useSelectedItem` hook (URL search params)

**New file:** `packages/frontend/src/hooks/useSelectedItem/index.ts`

Instead of a React context, the selected item is stored in URL search params: `?select=folder:<id>` or `?select=vault:<id>`. This makes selection shareable via links and eliminates the need for a context provider.

```typescript
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

interface ISelectedFolder {
  type: "folder";
  id: string;
}

interface ISelectedVault {
  type: "vault";
  id: string;
}

type SelectedItem = ISelectedFolder | ISelectedVault | null;

export const useSelectedItem = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get("select");
  let selectedItem: SelectedItem = null;

  if (raw) {
    const [type, id] = raw.split(":");
    if (type === "folder" && id) selectedItem = { type: "folder", id };
    else if (type === "vault" && id) selectedItem = { type: "vault", id };
  }

  const selectFolder = useCallback(
    (folderId: string) => {
      setSearchParams({ select: `folder:${folderId}` }, { replace: true });
    },
    [setSearchParams],
  );

  const selectVault = useCallback(
    (vaultId: string) => {
      setSearchParams({ select: `vault:${vaultId}` }, { replace: true });
    },
    [setSearchParams],
  );

  const clearSelection = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { selectedItem, selectFolder, selectVault, clearSelection };
};
```

Key details:
- `replace: true` on all `setSearchParams` calls — clicking rows must NOT create browser history entries. Only double-click navigation (which uses `navigate()`) creates history.
- The `select` param is removed entirely when cleared (no `?select=` in URL).
- Parsing is defensive — malformed params result in `null` selection.
- No context provider needed. Both `VirtualizedFileTable` and `AsideContent` call `useSelectedItem()` directly — they both have access to the same URL.

**IMPORTANT**: Verify that `setSearchParams` with `replace: true` preserves other existing search params (if any). If the app uses other query params on these routes, the implementation should merge instead of replace. Read `useSearchParams` docs if unsure.

## Step 8: Change file table to single-click select, double-click open

**File:** `packages/frontend/src/components/files/VirtualizedFileTable/index.tsx` (and related row components)

This is the core interaction change. Currently single-click navigates into folders and opens file previews. The new behavior:

- **Single click on folder row** → `selectFolder(folder.id)` (highlights row, aside shows that folder's details)
- **Single click on vault row** → `selectVault(vault.id)` (highlights row, aside shows that vault's details)
- **Double click on folder row** → navigate into folder (current `onClick` behavior moves here) + `clearSelection()`
- **Double click on vault row** → open preview (current preview `onClick` behavior moves here) + `clearSelection()`
- **Click on empty area / navigate away** → `clearSelection()`

The implementing session must:

1. Read `VirtualizedFileTable/index.tsx` and the folder/vault row components to understand the current click handlers.
2. Move the current `onClick` navigation/preview logic to `onDoubleClick`.
3. Add `onClick` handlers that call `selectFolder`/`selectVault` from `useSelectedItem()`.
4. Add a visual "selected" state to the clicked row (e.g., a CSS class with highlighted background using Mantine CSS variables like `var(--mantine-color-default-hover)`).
5. Clear selection when `folderId` URL param changes (user navigated to a different folder) — use a `useEffect` that calls `clearSelection()` when `folderId` changes.
6. Clear selection on Escape key press (optional but nice UX).

All selection functions come from `useSelectedItem()` hook (Step 7) which uses URL search params internally.

**CSS**: Add a `.selected` class to the row component's CSS module for the highlighted state.

## Step 9: Create `AuditLogSection` component

**New directory:** `packages/frontend/src/components/layout/AppShell/AsideContent/AuditLogSection/`

Follow the `FolderMembersSection` sibling pattern closely. The section contains:
- Title + description
- Virtualized list of decrypted audit log entries
- "Load more" button when `hasNextPage` is true

**New file:** `AuditLogSection/index.tsx` (~80 lines)

```typescript
// Props: { folderId: string | null; vaultId: string | null }
// Uses:
//   useGetAuditLogs(folderId, vaultId) for data fetching
//   useDecryptAuditLogs(allEntries) for decryption
//   Renders: Title, description text, AuditLogList, Load More button
// Flatten infinite query pages: data.pages.flatMap(p => p.logs)
```

**New file:** `AuditLogSection/index.module.css`

Follow `FolderMembersSection/index.module.css` pattern.

**New file:** `AuditLogSection/AuditLogList/index.tsx` (~80 lines)

Virtualized list using `@tanstack/react-virtual`. Follow `FolderMembersList/index.tsx` pattern:
- ROW_HEIGHT constant (e.g., 72 for more content per row)
- `useVirtualizer` with `count`, `getScrollElement`, `estimateSize`, `overscan`
- Padding spacers for top/bottom
- Each row renders: action description (from i18n key based on `payload.action`), actor name, context details, timestamp, IP address

**New file:** `AuditLogSection/AuditLogItem/index.tsx` (~60 lines, only if AuditLogList exceeds line limit)

Single audit log entry rendering. Shows:
- Action label (translated via `t(`aside.activity.actions.${payload.action}`)`)
- Actor name + email
- Context details (folder name, vault name, etc. from `payload.context`)
- Relative or absolute timestamp from `entry.createdAt`
- IP address from `entry.ipAddress`

## Step 10: Edit AsideContent to add Activity tab

**File:** `packages/frontend/src/components/layout/AppShell/AsideContent/index.tsx`

Current state (42 lines, 1 tab). Add a second tab "activity" and make both tabs follow the selected item from URL search params.

Changes:
1. Import `AuditLogSection` and `useSelectedItem` (from `hooks/useSelectedItem`)
2. Get `selectedItem` from `useSelectedItem()`
3. Compute effective IDs for both tabs:
   - If `selectedItem?.type === "vault"` → Activity uses `vaultId = selectedItem.id`; Members uses the vault's parent folderId (read from the vault data, or fall back to `folderId` from URL params)
   - If `selectedItem?.type === "folder"` → both tabs use `folderId = selectedItem.id`
   - If `selectedItem === null` → both tabs use `folderId` from `useParams()` (current behavior)
4. Add `<TabsTab value="activity">{t("aside.tabs.activity")}</TabsTab>` to TabsList
5. Add `<TabsPanel value="activity">` with `<AuditLogSection>` passing the computed folderId/vaultId
6. Update `FolderMembersSection` to receive the computed folderId (which may now be a selected subfolder's ID, not just the navigated folder's ID)

**Vault's parent folderId**: When a vault is selected, the Members tab needs that vault's parent `folderId` to show relevant members. The implementing session must determine how to access this — it may come from the decrypted vault data already loaded in the file table, or from the `select` param enriched with folder info. One option: encode it in the URL as `?select=vault:<vaultId>:<folderId>` and parse accordingly. Another: read it from the cached query data. The implementing session should choose the simplest approach.

The Activity tab should be visible for both root (no folderId) and folder views. When no folderId and no vaultId, it shows root-level events.

**IMPORTANT**: The current AsideContent shows an empty state message when `!folderId` for the members tab. The activity tab should NOT have this restriction — root-level audit logs are valid and should be displayed.

## Step 11: Add i18n keys

**File:** `packages/frontend/src/i18n/locales/en.json`

Add inside the `"aside"` object, after `"members"`:

```json
"activity": {
  "title": "Activity",
  "description": "Recent actions in this folder.",
  "descriptionFile": "Recent actions on this file.",
  "descriptionRoot": "Recent actions at workspace root.",
  "empty": "No activity recorded yet.",
  "loadMore": "Load more",
  "actions": {
    "folder.opened": "Opened folder",
    "folder.created": "Created folder",
    "vault.created": "Uploaded file",
    "vault.deleted": "Deleted file",
    "vault.moved_from": "Moved file away",
    "vault.moved_to": "Received file",
    "folder.moved_from": "Moved folder away",
    "folder.moved_to": "Received folder",
    "vault.previewed": "Previewed file",
    "vault.downloaded": "Downloaded file",
    "folder_acl.created": "Added member to folder"
  }
}
```

Also add `"activity"` to `"aside.tabs"`:

```json
"tabs": {
  "members": "Members",
  "activity": "Activity"
}
```

## Step 12: Instrument existing components with audit log calls

Add `usePostAuditLog` to each component/hook that performs a tracked action. Call `logAction(...)` after the operation succeeds. The audit log POST is fire-and-forget.

### 12a: Folder created

**File:** `components/files/AddNewEntity/CreateFolderAction/index.tsx`

After `createFolder.mutateAsync(payload)` succeeds, call:
```typescript
logAction({
  folderId: currentFolderId ?? null,  // parent folder
  action: "folder.created",
  context: { folderName: values.name },
});
```

### 12b: Folder deleted

**File:** `components/files/FolderListItem/index.tsx`

After `deleteFolder()` succeeds (in the delete confirmation handler), call:
```typescript
logAction({
  folderId: folder.parentFolderId ?? null,
  action: "folder.created",  // ← WRONG, this should be tracked differently
  // Actually: folder deletion removes the folder, so the parent folder should show the event
  // The implementing session should verify the exact callback location
});
```

**CORRECTION**: The plan listed `folder.created` above as a typo placeholder. The actual action for deletion is NOT in the tracked events list (the user did not request folder.deleted). Skip this instrumentation — folder deletion is NOT a tracked event.

Re-reading the requirements: the user listed 9 events. "Folder deleted" is NOT one of them. Only "vault deleted" (#4) is tracked. Do NOT add audit logging for folder deletion.

### 12c: Folder moved (2 entries)

**File:** `components/files/FolderListItem/index.tsx`

After `move(folder, targetFolderId)` succeeds, fire 2 audit log calls:
```typescript
// Source folder
logAction({
  folderId: folder.parentFolderId ?? null,
  action: "folder.moved_from",
  context: { movedFolderName: folder.name, targetFolderName: targetFolder.name },
});
// Target folder
logAction({
  folderId: targetFolderId,
  action: "folder.moved_to",
  context: { movedFolderName: folder.name, sourceFolderName: currentFolder.name },
});
```

The implementing session must verify where the move success callback is and what data is available (decrypted folder names). Read `useMoveFolder/index.ts` and the component that calls it.

### 12d: Vault created (file uploaded)

**File:** `contexts/UploadContext/useFileUpload/index.ts`

After `createVault.mutateAsync()` succeeds (around line 52-60), call:
```typescript
logAction({
  folderId: folderId ?? null,
  vaultId: createdVault.id,  // from the mutation response
  action: "vault.created",
  context: { vaultName: file.name },
});
```

The implementing session must verify the exact location after vault creation and what data is available. The file name should be the original unencrypted name.

### 12e: Vault deleted

**File:** `components/files/VaultListItem/index.tsx`

After `deleteVault()` succeeds, call:
```typescript
logAction({
  folderId: vault.folderId ?? null,
  vaultId: vault.id,
  action: "vault.deleted",
  context: { vaultName: vault.name },
});
```

### 12f: Vault moved (2 entries)

**File:** `components/files/VaultListItem/index.tsx`

After `move(vault, targetFolderId)` succeeds, fire 2 audit log calls:
```typescript
// Source folder
logAction({
  folderId: vault.folderId ?? null,
  vaultId: vault.id,
  action: "vault.moved_from",
  context: { vaultName: vault.name, targetFolderName: targetFolder.name },
});
// Target folder
logAction({
  folderId: targetFolderId,
  vaultId: vault.id,
  action: "vault.moved_to",
  context: { vaultName: vault.name, sourceFolderName: currentFolder.name },
});
```

### 12g: Vault previewed

**File:** The component where `previewRef.current?.open(vault)` is called (likely `VirtualizedFileTable/index.tsx`).

When preview opens:
```typescript
logAction({
  folderId: vault.folderId ?? null,
  vaultId: vault.id,
  action: "vault.previewed",
  context: { vaultName: vault.name },
});
```

### 12h: Vault downloaded

**File:** `components/files/VaultListItem/index.tsx` or wherever the download action triggers.

When download starts:
```typescript
logAction({
  folderId: vault.folderId ?? null,
  vaultId: vault.id,
  action: "vault.downloaded",
  context: { vaultName: vault.name },
});
```

### 12i: Folder ACL created (member added to folder)

**File:** `components/layout/AppShell/AsideContent/FolderMembersSection/index.tsx`

After `bulkAddMutation.mutateAsync(payload)` succeeds (around line 61), call for each added member:
```typescript
members.forEach((member) => {
  logAction({
    folderId,
    action: "folder_acl.created",
    context: { memberName: member.name, memberEmail: member.email },
  });
});
```

### 12j: Folder opened

**File:** `pages/HomePage/index.tsx` or the component that renders when navigating to a folder.

Use a `useEffect` that fires when `folderId` changes:
```typescript
useEffect(() => {
  if (!folderId) return;
  logAction({
    folderId,
    action: "folder.opened",
    context: { folderName: currentFolder?.name ?? "" },
  });
}, [folderId]);
```

The implementing session must verify where the folder name is available (it's decrypted elsewhere and might need to be accessed from a query or context).

---

## Verification

1. `npm run build` in `packages/frontend` — must succeed.
2. `npm run build` in `packages/shared` — must still succeed (no changes in this phase, but verify).
3. `git diff --stat` — verify only expected files are changed:
   - `packages/frontend/src/enums/api/QueryKeyEnum/index.ts` (edited)
   - `packages/frontend/src/enums/api/EndpointEnum/index.ts` (edited)
   - `packages/frontend/src/i18n/locales/en.json` (edited)
   - `packages/frontend/src/components/layout/AppShell/AsideContent/index.tsx` (edited)
   - Plus ~8-10 existing component files edited for instrumentation
   - `packages/frontend/src/utils/crypto/encryptAuditLog/index.ts` (new)
   - `packages/frontend/src/utils/crypto/decryptAuditLog/index.ts` (new)
   - `packages/frontend/src/api/hooks/usePostAuditLog/index.ts` (new)
   - `packages/frontend/src/api/hooks/useGetAuditLogs/index.ts` (new)
   - `packages/frontend/src/api/hooks/useDecryptAuditLogs/index.ts` (new)
   - `packages/frontend/src/hooks/useSelectedItem/index.ts` (new)
   - `packages/frontend/src/components/layout/AppShell/AsideContent/AuditLogSection/` (new directory)
4. All new files are under 120 lines (150 max).
5. No backend files are modified.
