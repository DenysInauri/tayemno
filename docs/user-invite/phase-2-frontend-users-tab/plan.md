# Phase 2 — Frontend: Users Tab + Invite

**Size/shape:** ~16 new files (page, components, hooks, validation, crypto, RoleWrapper), ~5 modified files (AppShell, App.tsx, RouteEnum, EndpointEnum, QueryKeyEnum, en.json). All frontend.

**Why this approach is sufficient — don't add anything beyond this:** This phase delivers the admin's user-management experience. The invited user's experience (forced password change) is Phase 3. Don't build the ChangePasswordPage, don't modify ProtectedRoute, don't modify SignInPage. The table is a simple Mantine Table — no pagination, no sorting (workspaces are small). Search is client-side filtering. The invite modal generates the crypto payload on the frontend (all key management is client-side per the E2EE model).

---

## Steps

### 1. Add route, endpoint, and query key enums

**File:** `packages/frontend/src/enums/routing/RouteEnum/index.ts`

Add after `SETTINGS`:
```typescript
  USERS = "/users",
```

**File:** `packages/frontend/src/enums/api/EndpointEnum/index.ts`

Add at the end:
```typescript
  MEMBERS = "/members",
```

**File:** `packages/frontend/src/enums/api/QueryKeyEnum/index.ts`

Add at the end:
```typescript
  MEMBERS = "members",
```

---

### 2. Create `RoleWrapper` component

**New file:** `packages/frontend/src/components/routing/RoleWrapper/index.tsx`

A reusable wrapper that renders its children only when the current user's workspace role is in the `allowedFor` list. Reads the role from `useAuth()`.

```typescript
import type { ReactNode } from "react";
import type { WorkspaceRole } from "@tayemno/shared";
import { useAuth } from "../../../contexts/AuthContext";

interface IRoleWrapperProps {
  allowedFor: WorkspaceRole[];
  children: ReactNode;
}

export const RoleWrapper = ({ allowedFor, children }: IRoleWrapperProps) => {
  const { workspace } = useAuth();

  if (!workspace || !allowedFor.includes(workspace.role)) return null;

  return <>{children}</>;
};
```

---

### 3. Add Users nav item to AppShell using RoleWrapper

**File:** `packages/frontend/src/components/layout/AppShell/index.tsx`

**3a.** Add `IconUsers` import:

Before:
```typescript
import { IconFolder, IconSettings, IconLogout } from "@tabler/icons-react";
```

After:
```typescript
import { IconFolder, IconSettings, IconUsers, IconLogout } from "@tabler/icons-react";
```

**3b.** Add `RoleWrapper` import:

```typescript
import { RoleWrapper } from "../../../components/routing/RoleWrapper";
```

**3c.** Add Users NavLink wrapped in `RoleWrapper` after Settings NavLink (inside the `<MantineAppShell.Section grow>`):

After the Settings NavLink (`</NavLink>` closing tag for Settings), add:
```tsx
          <RoleWrapper allowedFor={["owner", "admin"]}>
            <NavLink
              label={t("nav.users")}
              leftSection={<IconUsers size={20} />}
              active={location.pathname === RouteEnum.USERS}
              onClick={() => navigate(RouteEnum.USERS)}
            />
          </RoleWrapper>
```

No need to destructure `workspace` from `useAuth()` or add an inline role check — `RoleWrapper` handles it internally.

---

### 4. Add Users route in App.tsx

**File:** `packages/frontend/src/App.tsx`

**3a.** Add import for `UsersPage`:

```typescript
import { UsersPage } from "./pages/UsersPage";
```

**3b.** Add route inside the `<Route element={<AppShellLayout />}>` group, after the Settings route:

After:
```tsx
                <Route path={RouteEnum.SETTINGS} element={<SettingsPage />} />
```

Add:
```tsx
                <Route path={RouteEnum.USERS} element={<UsersPage />} />
```

---

### 5. Add i18n strings

**File:** `packages/frontend/src/i18n/locales/en.json`

**4a.** Add `"users"` key to `"nav"` object:

Before:
```json
  "nav": {
    "files": "Files",
    "settings": "Settings",
    "signOut": "Sign out"
  },
```

After:
```json
  "nav": {
    "files": "Files",
    "settings": "Settings",
    "users": "Users",
    "signOut": "Sign out"
  },
```

**4b.** Add `"users"` section at the top level (after `"settings"` section):

```json
  "users": {
    "title": "Users",
    "inviteButton": "Invite User",
    "search": {
      "placeholder": "Search by name or email"
    },
    "columns": {
      "name": "Name",
      "email": "Email",
      "role": "Role",
      "status": "Status",
      "actions": "Actions"
    },
    "status": {
      "active": "Active",
      "invited": "Invited"
    },
    "roles": {
      "owner": "Owner",
      "admin": "Admin",
      "member": "Member",
      "external_member": "External Member"
    },
    "invite": {
      "title": "Invite User",
      "fields": {
        "email": {
          "label": "Email",
          "placeholder": "user@example.com"
        },
        "name": {
          "label": "Name",
          "placeholder": "Full name"
        },
        "role": {
          "label": "Role"
        }
      },
      "roleDescriptions": {
        "admin": "Full access to all files, folders, keys, and member management. Has backup copies of all members' private keys.",
        "member": "Access to all files outside folders from the moment of invite. Can be added to folders later by an admin or owner.",
        "external_member": "No access to anything initially. Can only access folders explicitly granted by an admin or owner."
      },
      "submit": "Send Invite",
      "validation": {
        "emailRequired": "Email is required",
        "emailInvalid": "Please enter a valid email address",
        "nameRequired": "Name is required",
        "roleRequired": "Role is required"
      },
      "errors": {
        "userExists": "A user with this email already exists"
      }
    },
    "reinvite": {
      "success": "Invite resent successfully"
    },
    "delete": {
      "title": "Remove member?",
      "description": "This member will lose access to all workspace data. This action cannot be undone.",
      "confirm": "Remove",
      "cancel": "Cancel"
    }
  },
```

---

### 6. Create API hooks

**New file:** `packages/frontend/src/api/hooks/useGetMembers/index.ts`

```typescript
import type { IListMembersResponse } from "@tayemno/shared";
import { useQuery } from "@tanstack/react-query";
import axios from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useGetMembers = () => {
  const { workspace } = useAuth();

  return useQuery<IListMembersResponse>({
    queryKey: [QueryKeyEnum.MEMBERS, workspace?.id],
    queryFn: async () => {
      const { data } = await axios.get<IListMembersResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.MEMBERS}`,
      );
      return data;
    },
    enabled: !!workspace,
  });
};
```

**New file:** `packages/frontend/src/api/hooks/usePostInviteMember/index.ts`

```typescript
import type { IInviteMemberRequest, IInviteMemberResponse } from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostInviteMember = () => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiPost<IInviteMemberRequest, IInviteMemberResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.MEMBERS}`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.MEMBERS] });
      },
    },
  );
};
```

**New file:** `packages/frontend/src/api/hooks/useDeleteMember/index.ts`

```typescript
import type { IDeleteMemberResponse } from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useApiDelete } from "../useApiDelete";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const useDeleteMember = (memberId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiDelete<IDeleteMemberResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.MEMBERS}/${memberId}`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.MEMBERS] });
      },
    },
  );
};
```

Note: check the `useApiDelete` hook signature — it may not take a generic type for the response. If it only accepts `void`, adjust accordingly. Match the existing pattern from how `useDeleteFolder` or `useDeleteVault` work.

**New file:** `packages/frontend/src/api/hooks/usePostReinviteMember/index.ts`

```typescript
import type { IReinviteMemberRequest, IReinviteMemberResponse } from "@tayemno/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { useApiPost } from "../useApiPost";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";

export const usePostReinviteMember = (memberId: string) => {
  const queryClient = useQueryClient();
  const { workspace } = useAuth();

  return useApiPost<IReinviteMemberRequest, IReinviteMemberResponse>(
    `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.MEMBERS}/${memberId}/reinvite`,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QueryKeyEnum.MEMBERS] });
      },
    },
  );
};
```

---

### 7. Create invite validation schema

**New file:** `packages/frontend/src/validations/inviteUserSchema/index.ts`

Follow the pattern from `registerSchema/index.ts` — use i18n keys as error messages:

```typescript
import * as yup from "yup";

export const inviteUserSchema = yup.object({
  email: yup
    .string()
    .required("users.invite.validation.emailRequired")
    .email("users.invite.validation.emailInvalid"),
  name: yup
    .string()
    .trim()
    .required("users.invite.validation.nameRequired"),
  role: yup
    .string()
    .oneOf<string>(["admin", "member", "external_member"]) // InvitableRole values
    .required("users.invite.validation.roleRequired"),
});
```

---

### 8. Create temp password generator

**New file:** `packages/frontend/src/utils/generateTempPassword/index.ts`

A reusable utility (not page-specific — will be reused in future features). Generate a random password that satisfies the existing password requirements (6+ chars, number, lowercase, uppercase, special). Use `crypto.getRandomValues` for randomness.

```typescript
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SPECIAL = "!@#$%^&*";
const ALL = LOWERCASE + UPPERCASE + DIGITS + SPECIAL;

const randomChar = (charset: string): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return charset[array[0] % charset.length];
};

export const generateTempPassword = (length = 16): string => {
  const required = [
    randomChar(LOWERCASE),
    randomChar(UPPERCASE),
    randomChar(DIGITS),
    randomChar(SPECIAL),
  ];

  const remaining = Array.from({ length: length - required.length }, () =>
    randomChar(ALL),
  );

  const all = [...required, ...remaining];

  for (let i = all.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join("");
};
```

---

### 9. Create invite payload builder (crypto)

**New file:** `packages/frontend/src/pages/UsersPage/InviteUserModal/buildInvitePayload/index.ts`

This mirrors `buildRegistrationPayload/index.ts` but:
- Generates crypto for a NEW user, not the current user
- Uses existing workspace keys (not generating new workspace)
- Creates admin backup of new user's private key
- Shares workspace keys based on role

```typescript
import srp from "secure-remote-password/client";
import {
  generateSalt,
  deriveKey,
  KDF_ITERATIONS,
  KDF_MEMORY_BYTES,
  KDF_PARALLELISM,
} from "../../../../utils/crypto/deriveKey";
import { AsymmetricCrypto } from "../../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../../utils/crypto/SymmetricCrypto";
import type { IInviteMemberRequest, InvitableRole, IKeyPair, IWorkspaceData } from "@tayemno/shared";

interface IParams {
  email: string;
  name: string;
  role: InvitableRole;
  tempPassword: string;
  workspaceName: string;
  adminKeyPair: IKeyPair;
  workspace: IWorkspaceData;
}

export const buildInvitePayload = async ({
  email,
  name,
  role,
  tempPassword,
  workspaceName,
  adminKeyPair,
  workspace,
}: IParams): Promise<IInviteMemberRequest> => {
  const srpSalt = srp.generateSalt();
  const srpPrivateKey = srp.derivePrivateKey(
    srpSalt,
    email.toLowerCase(),
    tempPassword,
  );
  const srpVerifier = srp.deriveVerifier(srpPrivateKey);

  const kdfSalt = await generateSalt();
  const kek = await deriveKey({
    password: tempPassword,
    saltHex: kdfSalt,
    iterations: KDF_ITERATIONS,
    memoryLimit: KDF_MEMORY_BYTES,
  });

  const newUserKeyPair = await AsymmetricCrypto.generateKeyPair();
  const encryptedPrivateKey = await SymmetricCrypto.encrypt(
    newUserKeyPair.privateKey,
    kek,
  );

  const adminEncryptedUserPrivateKey = await AsymmetricCrypto.encrypt(
    newUserKeyPair.privateKey,
    workspace.adminPublicKey,
  );

  let encryptedAdminPrivateKey: string | null = null;
  let encryptedMemberPrivateKey: string | null = null;

  if (role === "admin") {
    const workspaceAdminPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedAdminPrivateKey!,
      adminKeyPair.publicKey,
      adminKeyPair.privateKey,
    );
    encryptedAdminPrivateKey = await AsymmetricCrypto.encrypt(
      workspaceAdminPrivateKey,
      newUserKeyPair.publicKey,
    );

    const workspaceMemberPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedMemberPrivateKey!,
      adminKeyPair.publicKey,
      adminKeyPair.privateKey,
    );
    encryptedMemberPrivateKey = await AsymmetricCrypto.encrypt(
      workspaceMemberPrivateKey,
      newUserKeyPair.publicKey,
    );
  } else if (role === "member") {
    const workspaceMemberPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedMemberPrivateKey!,
      adminKeyPair.publicKey,
      adminKeyPair.privateKey,
    );
    encryptedMemberPrivateKey = await AsymmetricCrypto.encrypt(
      workspaceMemberPrivateKey,
      newUserKeyPair.publicKey,
    );
  }
  // external_member: both keys remain null

  return {
    email,
    name,
    role,
    srpSalt,
    srpVerifier,
    kdfSalt,
    kdfAlgorithm: "argon2id",
    kdfMemoryKib: KDF_MEMORY_BYTES / 1024,
    kdfIterations: KDF_ITERATIONS,
    kdfParallelism: KDF_PARALLELISM,
    publicKey: newUserKeyPair.publicKey,
    encryptedPrivateKey: encryptedPrivateKey.ciphertext,
    privateKeyNonce: encryptedPrivateKey.nonce,
    adminEncryptedUserPrivateKey,
    encryptedAdminPrivateKey,
    encryptedMemberPrivateKey,
    tempPassword,
    workspaceName,
  };
};
```

Note: This file will be ~100 lines which is within the 120-line limit.

---

### 10. Create re-invite payload builder

**New file:** `packages/frontend/src/pages/UsersPage/buildReinvitePayload/index.ts`

For re-invite, the admin:
1. Decrypts the user's private key from the admin backup (`adminEncryptedUserPrivateKey`)
2. Generates new temp password
3. Creates new SRP/KDF/encrypted-key data

```typescript
import srp from "secure-remote-password/client";
import {
  generateSalt,
  deriveKey,
  KDF_ITERATIONS,
  KDF_MEMORY_BYTES,
  KDF_PARALLELISM,
} from "../../../utils/crypto/deriveKey";
import { AsymmetricCrypto } from "../../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import type { IReinviteMemberRequest, IKeyPair, IWorkspaceData } from "@tayemno/shared";

interface IParams {
  email: string;
  tempPassword: string;
  workspaceName: string;
  adminEncryptedUserPrivateKey: string;
  adminKeyPair: IKeyPair;
  workspace: IWorkspaceData;
}

export const buildReinvitePayload = async ({
  email,
  tempPassword,
  workspaceName,
  adminEncryptedUserPrivateKey,
  adminKeyPair,
  workspace,
}: IParams): Promise<IReinviteMemberRequest> => {
  const workspaceAdminPrivateKey = await AsymmetricCrypto.decrypt(
    workspace.encryptedAdminPrivateKey!,
    adminKeyPair.publicKey,
    adminKeyPair.privateKey,
  );

  const userPrivateKey = await AsymmetricCrypto.decrypt(
    adminEncryptedUserPrivateKey,
    workspace.adminPublicKey,
    workspaceAdminPrivateKey,
  );

  const srpSalt = srp.generateSalt();
  const srpPrivateKey = srp.derivePrivateKey(srpSalt, email.toLowerCase(), tempPassword);
  const srpVerifier = srp.deriveVerifier(srpPrivateKey);

  const kdfSalt = await generateSalt();
  const kek = await deriveKey({
    password: tempPassword,
    saltHex: kdfSalt,
    iterations: KDF_ITERATIONS,
    memoryLimit: KDF_MEMORY_BYTES,
  });

  const encryptedPrivateKey = await SymmetricCrypto.encrypt(userPrivateKey, kek);

  return {
    srpSalt,
    srpVerifier,
    kdfSalt,
    kdfAlgorithm: "argon2id",
    kdfMemoryKib: KDF_MEMORY_BYTES / 1024,
    kdfIterations: KDF_ITERATIONS,
    kdfParallelism: KDF_PARALLELISM,
    encryptedPrivateKey: encryptedPrivateKey.ciphertext,
    privateKeyNonce: encryptedPrivateKey.nonce,
    tempPassword,
    workspaceName,
  };
};
```

---

### 11. Create InviteUserModal component

**New file:** `packages/frontend/src/pages/UsersPage/InviteUserModal/index.tsx`

A modal with Formik form: email, name, role picker. On submit, generates temp password, builds crypto payload, calls invite API.

Pattern: follow `MoveItemModal` for modal structure. Keep under 120 lines — the crypto logic is extracted to `buildInvitePayload/`. The role picker is extracted to `RolePicker/`.

The modal should:
- Use `useFormik` with `inviteUserSchema`
- On submit: call `generateTempPassword()` → call `buildInvitePayload()` → call `mutateAsync` from `usePostInviteMember` → close modal
- Show loading state during crypto generation + API call (Argon2id is slow: ~1-2s)
- Display API errors (especially 409 "user already exists")
- Reset form on close

```
Props:
  opened: boolean
  onClose: () => void
```

Render:
- Modal title: `t("users.invite.title")`
- TextInput for email
- TextInput for name
- RolePicker (custom Select component, see step 11)
- Error text if submit failed
- Submit button with loading state

---

### 12. Create RolePicker component

**New file:** `packages/frontend/src/pages/UsersPage/InviteUserModal/RolePicker/index.tsx`

A Mantine `Select` component with custom `renderOption` to show role descriptions.

Roles shown (Owner excluded per spec):
- `admin` → "Admin" + description
- `member` → "Member" + description
- `external_member` → "External Member" + description

```
Props:
  value: string
  onChange: (value: string) => void
  error?: string
```

Use Mantine's `Select` with `data` containing `{ value, label }` entries and `renderOption` for styled descriptions. Descriptions come from `t("users.invite.roleDescriptions.admin")` etc.

Keep under 120 lines.

---

### 13. Create UsersTable component

**New file:** `packages/frontend/src/pages/UsersPage/UsersTable/index.tsx`

A Mantine `Table` displaying member rows. Each row shows: name, email, role (localized), status badge, action buttons.

```
Props:
  members: IMemberItem[]
  onDelete: (member: IMemberItem) => void
  onReinvite: (member: IMemberItem) => void
  currentUserId: string
```

Columns:
- Name
- Email
- Role — use `t("users.roles.${member.role}")`
- Status — `Badge` component: green for "active", yellow for "invited"
- Actions — `ActionIcon` buttons:
  - Re-invite (only if status === "invited"): `IconMailForward` or `IconSend`
  - Delete (only if role !== "owner" and userId !== currentUserId): `IconTrash`

Keep under 120 lines.

---

### 14. Create DeleteMemberModal component

**New file:** `packages/frontend/src/pages/UsersPage/DeleteMemberModal/index.tsx`

A confirmation modal before deleting a member.

```
Props:
  opened: boolean
  member: IMemberItem | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
```

Shows:
- Title: `t("users.delete.title")`
- Description: `t("users.delete.description")`
- Member name and email
- Cancel + Confirm buttons

Keep under 80 lines. Follow the pattern from `deleteFolder` confirmation dialog.

---

### 15. Create UsersPage component

**New file:** `packages/frontend/src/pages/UsersPage/index.tsx`

Thin shell composing the extracted pieces:
- Title
- Search input + Invite button
- UsersTable
- InviteUserModal
- DeleteMemberModal

```typescript
// Pseudostructure:
const UsersPage = () => {
  const { t } = useTranslation();
  const { user, workspace, keyPair } = useAuth();
  const { data: membersResponse, isLoading } = useGetMembers();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<IMemberItem | null>(null);

  // Filter members by search query (name or email)
  const filteredMembers = useMemo(() => {
    if (!membersResponse?.members) return [];
    if (!searchQuery) return membersResponse.members;
    const q = searchQuery.toLowerCase();
    return membersResponse.members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [membersResponse?.members, searchQuery]);

  // Re-invite handler: generates new temp password, builds payload, calls API
  const handleReinvite = async (member: IMemberItem) => { ... };

  // Delete handler
  const handleDelete = async () => { ... };

  return (
    <>
      <Title>{t("users.title")}</Title>
      <Group>
        <TextInput placeholder={t("users.search.placeholder")} ... />
        <Button onClick={() => setInviteModalOpen(true)}>{t("users.inviteButton")}</Button>
      </Group>
      <UsersTable members={filteredMembers} onDelete={setMemberToDelete} onReinvite={handleReinvite} currentUserId={user!.id} />
      <InviteUserModal opened={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
      <DeleteMemberModal opened={!!memberToDelete} member={memberToDelete} onClose={() => setMemberToDelete(null)} onConfirm={handleDelete} isDeleting={...} />
    </>
  );
};
```

This file will be around 100-120 lines. If it exceeds 120 lines, extract the re-invite handler logic into a separate `useReinviteMember/index.ts` hook.

---

### 16. Wire up the workspace name decryption for invite/reinvite

The invite and reinvite payloads need the decrypted workspace name. The admin has the member private key to decrypt it.

In `UsersPage` (or an extracted hook), decrypt the workspace name:

```typescript
const [workspaceName, setWorkspaceName] = useState("");

useEffect(() => {
  const decrypt = async () => {
    if (!workspace || !keyPair) return;
    const memberPrivateKey = await AsymmetricCrypto.decrypt(
      workspace.encryptedMemberPrivateKey!,
      keyPair.publicKey,
      keyPair.privateKey,
    );
    const name = await AsymmetricCrypto.decrypt(
      workspace.encryptedName,
      workspace.memberPublicKey,
      memberPrivateKey,
    );
    setWorkspaceName(name);
  };
  decrypt();
}, [workspace, keyPair]);
```

Pass `workspaceName` to `InviteUserModal` and to `handleReinvite`.

If this adds too many lines to UsersPage, extract to `useDecryptWorkspaceName/index.ts`.

---

### 17. Handle sign-in page email pre-fill from query param

**File:** `packages/frontend/src/pages/SignInPage/index.tsx`

Read `email` query parameter from URL and pre-fill the identifier field.

**16a.** Add `useSearchParams` import:

```typescript
import { useNavigate, useSearchParams } from "react-router-dom";
```

**16b.** Read the query param and use as initial value:

Before:
```typescript
  const formik = useFormik<ISignInFormValues>({
    initialValues: {
      identifier: "",
      password: "",
    },
```

After:
```typescript
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";

  const formik = useFormik<ISignInFormValues>({
    initialValues: {
      identifier: emailFromQuery,
      password: "",
    },
```

---

### Summary of new files

```
packages/frontend/src/
  components/routing/RoleWrapper/index.tsx # Reusable role-gated wrapper (~15 lines)
  utils/generateTempPassword/index.ts      # Reusable temp password generator (~30 lines)
  pages/UsersPage/
    index.tsx                              # Page shell (~100-120 lines)
    UsersTable/index.tsx                   # Members table (~80-100 lines)
    InviteUserModal/
      index.tsx                            # Invite form modal (~100-120 lines)
      RolePicker/index.tsx                 # Role select with descriptions (~60-80 lines)
      buildInvitePayload/index.ts          # Crypto payload builder (~100 lines)
    DeleteMemberModal/index.tsx            # Delete confirmation (~60-80 lines)
    buildReinvitePayload/index.ts          # Re-invite crypto payload (~70 lines)
  api/hooks/
    useGetMembers/index.ts                 # GET members query hook
    usePostInviteMember/index.ts           # POST invite mutation hook
    useDeleteMember/index.ts               # DELETE member mutation hook
    usePostReinviteMember/index.ts         # POST reinvite mutation hook
  validations/inviteUserSchema/index.ts    # Yup schema for invite form
```
