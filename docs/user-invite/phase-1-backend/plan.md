# Phase 1 — Backend: Schema + APIs

**Size/shape:** ~10 new files (services, routes, repositories, email template), ~6 modified files (schema, shared types, config, existing services/routes). All backend.

**Why this approach is sufficient — don't add anything beyond this:** This phase delivers all backend changes needed for Phases 2 and 3. It does NOT touch the frontend. It does NOT implement folder ACL management for external members. It does NOT build voluntary password change. Keep the services thin — validate, call repos, send email, return. No middleware abstraction for role-checking; inline the role check in each service (there are only 4 member-management services).

---

## Steps

### 1. Update shared types

**File:** `packages/shared/src/index.ts`

**1a.** Modify `WorkspaceRole` (line 39):

Before:
```typescript
export type WorkspaceRole = "owner" | "admin" | "member";
```

After:
```typescript
export type WorkspaceRole = "owner" | "admin" | "member" | "external_member";
```

**1b.** Add `WorkspaceMemberStatus` type after `WorkspaceRole`:

```typescript
export type WorkspaceMemberStatus = "invited" | "active";
```

**1c.** Add `forcePasswordChange` to `ISignInUserData` (after line 242, before the closing `}`):

```typescript
  forcePasswordChange: boolean;
```

**1d.** Make `encryptedMemberPrivateKey` nullable in `IWorkspaceData` (line 188):

Before:
```typescript
  encryptedMemberPrivateKey: string;
```

After:
```typescript
  encryptedMemberPrivateKey: string | null;
```

**1e.** Add `status` and `adminEncryptedUserPrivateKey` to `WorkspaceMember` interface (after `encryptedMemberPrivateKey`, before `createdAt`):

Before:
```typescript
  encryptedMemberPrivateKey: string;
  createdAt: string;
```

After:
```typescript
  encryptedMemberPrivateKey: string | null;
  status: WorkspaceMemberStatus;
  adminEncryptedUserPrivateKey: string | null;
  createdAt: string;
```

**1f.** Update `NewWorkspaceMember` to include optional new fields and make `encryptedMemberPrivateKey` optional+nullable:

Before:
```typescript
export interface NewWorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  encryptedAdminPrivateKey?: string | null;
  encryptedMemberPrivateKey: string;
}
```

After:
```typescript
export interface NewWorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  encryptedAdminPrivateKey?: string | null;
  encryptedMemberPrivateKey?: string | null;
  status?: WorkspaceMemberStatus;
  adminEncryptedUserPrivateKey?: string | null;
}
```

**1g.** Add new request/response interfaces at the end of the file (before the final blank line). Copy exact shapes from below:

```typescript
export interface IMemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  adminEncryptedUserPrivateKey: string | null;
  createdAt: string;
}

export type InvitableRole = Exclude<WorkspaceRole, "owner">;

export interface IInviteMemberRequest {
  email: string;
  name: string;
  role: InvitableRole;
  srpSalt: string;
  srpVerifier: string;
  kdfSalt: string;
  kdfAlgorithm: "argon2id";
  kdfMemoryKib: number;
  kdfIterations: number;
  kdfParallelism: number;
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
  adminEncryptedUserPrivateKey: string;
  encryptedAdminPrivateKey: string | null;
  encryptedMemberPrivateKey: string | null;
  tempPassword: string;
  workspaceName: string;
}

export interface IInviteMemberResponse {
  member: IMemberItem;
}

export interface IListMembersResponse {
  members: IMemberItem[];
}

export interface IDeleteMemberResponse {
  message: string;
}

export interface IReinviteMemberRequest {
  srpSalt: string;
  srpVerifier: string;
  kdfSalt: string;
  kdfAlgorithm: "argon2id";
  kdfMemoryKib: number;
  kdfIterations: number;
  kdfParallelism: number;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
  tempPassword: string;
  workspaceName: string;
}

export interface IReinviteMemberResponse {
  message: string;
}

export interface IChangePasswordRequest {
  srpSalt: string;
  srpVerifier: string;
  kdfSalt: string;
  kdfAlgorithm: "argon2id";
  kdfMemoryKib: number;
  kdfIterations: number;
  kdfParallelism: number;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
}

export interface IChangePasswordResponse {
  message: string;
}
```

---

### 2. Update DB schema

**File:** `packages/backend/src/db/schema.ts`

**2a.** Add `forcePasswordChange` to `users` table (after `privateKeyNonce` field, before `createdAt`):

Before:
```typescript
  privateKeyNonce: text("private_key_nonce").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
```

After:
```typescript
  privateKeyNonce: text("private_key_nonce").notNull(),

  forcePasswordChange: boolean("force_password_change").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
```

**2b.** Add `status` and `adminEncryptedUserPrivateKey` to `workspaceMembers` table, and make `encryptedMemberPrivateKey` nullable:

Before:
```typescript
    encryptedAdminPrivateKey: text("encrypted_admin_private_key"),
    encryptedMemberPrivateKey: text("encrypted_member_private_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
```

After:
```typescript
    encryptedAdminPrivateKey: text("encrypted_admin_private_key"),
    encryptedMemberPrivateKey: text("encrypted_member_private_key"),
    status: varchar("status", { length: 32 }).default("active").notNull(),
    adminEncryptedUserPrivateKey: text("admin_encrypted_user_private_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
```

Note: `encryptedMemberPrivateKey` loses its `.notNull()` — this is required for `external_member` who gets no workspace keys.

---

### 3. Push schema changes

Run `npm run db:push -w packages/backend` to apply schema changes to the dev database. If the project uses migrations instead, run `npm run db:generate -w packages/backend` followed by `npm run db:migrate -w packages/backend`. Check which approach is used by looking for existing files in `packages/backend/drizzle/` directory.

---

### 4. Add `FRONTEND_URL` to backend config

**File:** `packages/backend/src/config.ts`

**4a.** Add `FRONTEND_URL` to the `required` array (line 6-13):

Before:
```typescript
  required: [
    "DATABASE_URL",
    "JWT_SECRET",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET",
  ],
```

After:
```typescript
  required: [
    "DATABASE_URL",
    "JWT_SECRET",
    "FRONTEND_URL",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET",
  ],
```

**4b.** Add `FRONTEND_URL` to properties (after `SMTP_FROM`):

```typescript
    FRONTEND_URL: { type: "string" },
```

**4c.** Add `FRONTEND_URL` to the `Config` type:

```typescript
  FRONTEND_URL: string;
```

**4d.** Add `FRONTEND_URL` to `.env` file at the repo root:

```
FRONTEND_URL=http://localhost:5173
```

---

### 5. Add methods to users repository

**File:** `packages/backend/src/repositories/users/index.ts`

Add three methods after the existing `create` function. Follow the same pattern (pure functions, return single result). Import `eq` is already imported.

```typescript
export const findById = async (db: Database, id: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0];
};

export const update = async (
  db: Database,
  id: string,
  data: Partial<typeof users.$inferInsert>,
) => {
  const result = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  return result[0];
};

export const deleteById = async (db: Database, id: string) => {
  await db.delete(users).where(eq(users.id, id));
};
```

---

### 6. Add methods to workspaceMembers repository

**File:** `packages/backend/src/repositories/workspaceMembers/index.ts`

Add three methods after the existing functions. The `users` table import is needed for the join.

**6a.** Add `users` import at the top:

Before:
```typescript
import { workspaceMembers } from "../../db/schema.js";
```

After:
```typescript
import { workspaceMembers, users } from "../../db/schema.js";
```

**6b.** Add these methods at the end:

```typescript
export const findAllByWorkspaceId = async (
  db: Database,
  workspaceId: string,
) => {
  return db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      adminEncryptedUserPrivateKey: workspaceMembers.adminEncryptedUserPrivateKey,
      createdAt: workspaceMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
};

export const findById = async (db: Database, id: string) => {
  const result = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.id, id))
    .limit(1);

  return result[0];
};

export const updateStatusByUserId = async (
  db: Database,
  userId: string,
  status: string,
) => {
  await db
    .update(workspaceMembers)
    .set({ status })
    .where(eq(workspaceMembers.userId, userId));
};
```

---

### 7. Create invite email service

**New file:** `packages/backend/src/services/email/sendInviteEmail/index.ts`

Copy the pattern from `sendVerificationEmail/index.ts`. The email includes: workspace name, user's email, temp password, link to sign-in page, and a notice about forced password change.

```typescript
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface IParams {
  transport: Transporter;
  from: string;
  to: string;
  workspaceName: string;
  tempPassword: string;
  frontendUrl: string;
}

export const sendInviteEmail = async ({
  transport,
  from,
  to,
  workspaceName,
  tempPassword,
  frontendUrl,
}: IParams) => {
  const signInUrl = `${frontendUrl}/sign-in?email=${encodeURIComponent(to)}`;

  const info = await transport.sendMail({
    from,
    to,
    subject: `You've been invited to ${workspaceName} — Tayemno`,
    text: [
      `You've been invited to the workspace "${workspaceName}".`,
      "",
      `Email: ${to}`,
      `Temporary password: ${tempPassword}`,
      "",
      `Sign in at: ${signInUrl}`,
      "",
      "You will be required to change your password after your first sign-in.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>You've been invited to ${workspaceName}</h2>
        <p>Use the credentials below to sign in:</p>
        <table style="margin: 16px 0;">
          <tr><td style="color: #666; padding-right: 12px;">Email</td><td><strong>${to}</strong></td></tr>
          <tr><td style="color: #666; padding-right: 12px;">Password</td><td><strong>${tempPassword}</strong></td></tr>
        </table>
        <p><a href="${signInUrl}" style="display: inline-block; padding: 10px 20px; background: #228be6; color: #fff; text-decoration: none; border-radius: 4px;">Sign in</a></p>
        <p style="color: #666; margin-top: 16px;">You will be required to change your password after your first sign-in.</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("Preview URL:", previewUrl);
  }
};
```

**Update export:** `packages/backend/src/services/email/index.ts`

Before:
```typescript
export { createTransport } from "./createTransport";
export { sendVerificationEmail } from "./sendVerificationEmail";
```

After:
```typescript
export { createTransport } from "./createTransport";
export { sendVerificationEmail } from "./sendVerificationEmail";
export { sendInviteEmail } from "./sendInviteEmail";
```

---

### 8. Create `inviteMember` service

**New file:** `packages/backend/src/services/members/inviteMember/index.ts`

Logic:
1. Get requesting user's membership, verify role is `owner` or `admin`
2. Check if email already exists in `users` table → throw `409 "User with this email already exists"`
3. Create user record with `emailVerified: true`, `forcePasswordChange: true`, and all SRP/KDF/key fields from request
4. Create `workspace_members` record with `status: "invited"`, role, encrypted keys, and `adminEncryptedUserPrivateKey`
5. Send invite email
6. Return member item (joined user + membership data)

```typescript
import type { IInviteMemberRequest, IMemberItem, InvitableRole } from "@tayemno/shared";
import type { Transporter } from "nodemailer";
import type { Database } from "../../../db";
import * as usersRepo from "../../../repositories/users";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { sendInviteEmail } from "../../email";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  requestingUserId: string;
  workspaceId: string;
  data: IInviteMemberRequest;
  mailTransport: Transporter;
  smtpFrom: string;
  frontendUrl: string;
}

export const inviteMember = async ({
  db,
  requestingUserId,
  workspaceId,
  data,
  mailTransport,
  smtpFrom,
  frontendUrl,
}: IParams): Promise<IMemberItem> => {
  const requester = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    requestingUserId,
  );

  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    throw new HttpError(403, "Only owners and admins can invite members");
  }

  const existingUser = await usersRepo.findByEmail(db, data.email.toLowerCase());
  if (existingUser) {
    throw new HttpError(409, "User with this email already exists");
  }

  const user = await usersRepo.create(db, {
    email: data.email.toLowerCase(),
    emailVerified: true,
    name: data.name,
    srpSalt: data.srpSalt,
    srpVerifier: data.srpVerifier,
    kdfSalt: data.kdfSalt,
    kdfAlgorithm: data.kdfAlgorithm,
    kdfMemoryKib: data.kdfMemoryKib,
    kdfIterations: data.kdfIterations,
    kdfParallelism: data.kdfParallelism,
    publicKey: data.publicKey,
    encryptedPrivateKey: data.encryptedPrivateKey,
    privateKeyNonce: data.privateKeyNonce,
    forcePasswordChange: true,
  });

  const membership = await workspaceMembersRepo.create(db, {
    workspaceId,
    userId: user.id,
    role: data.role,
    status: "invited",
    encryptedAdminPrivateKey: data.encryptedAdminPrivateKey,
    encryptedMemberPrivateKey: data.encryptedMemberPrivateKey,
    adminEncryptedUserPrivateKey: data.adminEncryptedUserPrivateKey,
  });

  await sendInviteEmail({
    transport: mailTransport,
    from: smtpFrom,
    to: user.email,
    workspaceName: data.workspaceName,
    tempPassword: data.tempPassword,
    frontendUrl,
  });

  return {
    id: membership.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: membership.role as InvitableRole,
    status: "invited",
    adminEncryptedUserPrivateKey: membership.adminEncryptedUserPrivateKey,
    createdAt: membership.createdAt.toISOString(),
  };
};
```

---

### 9. Create `listMembers` service

**New file:** `packages/backend/src/services/members/listMembers/index.ts`

Logic:
1. Verify requesting user is `owner` or `admin`
2. Query all members in workspace (joined with users for name/email)
3. Return as `IMemberItem[]`

```typescript
import type { IMemberItem, WorkspaceRole, WorkspaceMemberStatus } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  requestingUserId: string;
  workspaceId: string;
}

export const listMembers = async ({
  db,
  requestingUserId,
  workspaceId,
}: IParams): Promise<IMemberItem[]> => {
  const requester = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    requestingUserId,
  );

  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    throw new HttpError(403, "Only owners and admins can view members");
  }

  const rows = await workspaceMembersRepo.findAllByWorkspaceId(db, workspaceId);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role as WorkspaceRole,
    status: (row.status ?? "active") as WorkspaceMemberStatus,
    adminEncryptedUserPrivateKey: row.adminEncryptedUserPrivateKey,
    createdAt: row.createdAt.toISOString(),
  }));
};
```

---

### 10. Create `deleteMember` service

**New file:** `packages/backend/src/services/members/deleteMember/index.ts`

Logic:
1. Verify requesting user is `owner` or `admin`
2. Find the target membership by `memberId`
3. Validate: target is not `owner`, target is not the requesting user
4. Delete the **user** record (cascades to `workspace_members`, `folder_acls`)
5. Return success message

```typescript
import type { Database } from "../../../db";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as usersRepo from "../../../repositories/users";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  requestingUserId: string;
  workspaceId: string;
  memberId: string;
}

export const deleteMember = async ({
  db,
  requestingUserId,
  workspaceId,
  memberId,
}: IParams) => {
  const requester = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    requestingUserId,
  );

  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    throw new HttpError(403, "Only owners and admins can delete members");
  }

  const target = await workspaceMembersRepo.findById(db, memberId);

  if (!target || target.workspaceId !== workspaceId) {
    throw new HttpError(404, "Member not found");
  }

  if (target.role === "owner") {
    throw new HttpError(403, "Cannot delete the workspace owner");
  }

  if (target.userId === requestingUserId) {
    throw new HttpError(403, "Cannot delete yourself");
  }

  await usersRepo.deleteById(db, target.userId);

  return { message: "Member deleted" };
};
```

---

### 11. Create `reinviteMember` service

**New file:** `packages/backend/src/services/members/reinviteMember/index.ts`

Logic:
1. Verify requesting user is `owner` or `admin`
2. Find target membership by `memberId`, verify status is `'invited'`
3. Update user record with new SRP + KDF + encrypted key data, set `forcePasswordChange: true`
4. Re-send invite email with new temp password
5. Return success

```typescript
import type { IReinviteMemberRequest } from "@tayemno/shared";
import type { Transporter } from "nodemailer";
import type { Database } from "../../../db";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import * as usersRepo from "../../../repositories/users";
import { sendInviteEmail } from "../../email";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  requestingUserId: string;
  workspaceId: string;
  memberId: string;
  data: IReinviteMemberRequest;
  mailTransport: Transporter;
  smtpFrom: string;
  frontendUrl: string;
}

export const reinviteMember = async ({
  db,
  requestingUserId,
  workspaceId,
  memberId,
  data,
  mailTransport,
  smtpFrom,
  frontendUrl,
}: IParams) => {
  const requester = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    requestingUserId,
  );

  if (!requester || (requester.role !== "owner" && requester.role !== "admin")) {
    throw new HttpError(403, "Only owners and admins can reinvite members");
  }

  const target = await workspaceMembersRepo.findById(db, memberId);

  if (!target || target.workspaceId !== workspaceId) {
    throw new HttpError(404, "Member not found");
  }

  if (target.status !== "invited") {
    throw new HttpError(400, "Can only reinvite members with invited status");
  }

  const user = await usersRepo.findById(db, target.userId);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  await usersRepo.update(db, user.id, {
    srpSalt: data.srpSalt,
    srpVerifier: data.srpVerifier,
    kdfSalt: data.kdfSalt,
    kdfAlgorithm: data.kdfAlgorithm,
    kdfMemoryKib: data.kdfMemoryKib,
    kdfIterations: data.kdfIterations,
    kdfParallelism: data.kdfParallelism,
    encryptedPrivateKey: data.encryptedPrivateKey,
    privateKeyNonce: data.privateKeyNonce,
    forcePasswordChange: true,
  });

  await sendInviteEmail({
    transport: mailTransport,
    from: smtpFrom,
    to: user.email,
    workspaceName: data.workspaceName,
    tempPassword: data.tempPassword,
    frontendUrl,
  });

  return { message: "Invite resent" };
};
```

---

### 12. Create members service index

**New file:** `packages/backend/src/services/members/index.ts`

```typescript
export { inviteMember } from "./inviteMember";
export { listMembers } from "./listMembers";
export { deleteMember } from "./deleteMember";
export { reinviteMember } from "./reinviteMember";
```

---

### 13. Create `changePassword` auth service

**New file:** `packages/backend/src/services/auth/changePassword/index.ts`

Logic:
1. Find user by `userId` (from JWT)
2. Update user: new SRP, KDF, encrypted private key, `forcePasswordChange: false`
3. Update workspace_members status from `'invited'` to `'active'` for this userId
4. Return success

```typescript
import type { IChangePasswordRequest } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as usersRepo from "../../../repositories/users";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

interface IParams {
  db: Database;
  userId: string;
  data: IChangePasswordRequest;
}

export const changePassword = async ({ db, userId, data }: IParams) => {
  const user = await usersRepo.findById(db, userId);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  await usersRepo.update(db, userId, {
    srpSalt: data.srpSalt,
    srpVerifier: data.srpVerifier,
    kdfSalt: data.kdfSalt,
    kdfAlgorithm: data.kdfAlgorithm,
    kdfMemoryKib: data.kdfMemoryKib,
    kdfIterations: data.kdfIterations,
    kdfParallelism: data.kdfParallelism,
    encryptedPrivateKey: data.encryptedPrivateKey,
    privateKeyNonce: data.privateKeyNonce,
    forcePasswordChange: false,
  });

  await workspaceMembersRepo.updateStatusByUserId(db, userId, "active");

  return { message: "Password changed successfully" };
};
```

**Update auth service index:** `packages/backend/src/services/auth/index.ts`

Before:
```typescript
export { register } from "./register";
export { verifyEmail } from "./verifyEmail";
export { resendVerification } from "./resendVerification";
export { signInInit } from "./signInInit";
export { signInVerify } from "./signInVerify";
```

After:
```typescript
export { register } from "./register";
export { verifyEmail } from "./verifyEmail";
export { resendVerification } from "./resendVerification";
export { signInInit } from "./signInInit";
export { signInVerify } from "./signInVerify";
export { changePassword } from "./changePassword";
```

---

### 14. Modify `signInVerify` service to include `forcePasswordChange`

**File:** `packages/backend/src/services/auth/signInVerify/index.ts`

Add `forcePasswordChange` to the user object in the response (line 75, after `kdfParallelism`):

Before:
```typescript
      kdfParallelism: user.kdfParallelism,
    },
    workspace: {
```

After:
```typescript
      kdfParallelism: user.kdfParallelism,
      forcePasswordChange: user.forcePasswordChange,
    },
    workspace: {
```

Also update the `ISignInVerifyResult` interface's `user` field type to use `ISignInUserData` (it already does — verify this matches the updated shared type that now includes `forcePasswordChange`).

---

### 15. Create members routes

**New file:** `packages/backend/src/routes/members/index.ts`

Follow the same pattern as `routes/folders/index.ts`: register `authenticate` hook, then register individual route handlers.

```typescript
import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { inviteMemberRoute } from "./inviteMember";
import { listMembersRoute } from "./listMembers";
import { deleteMemberRoute } from "./deleteMember";
import { reinviteMemberRoute } from "./reinviteMember";

export const membersRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(inviteMemberRoute);
  await app.register(listMembersRoute);
  await app.register(deleteMemberRoute);
  await app.register(reinviteMemberRoute);
};
```

**New file:** `packages/backend/src/routes/members/inviteMember/index.ts`

Follow the same pattern as `routes/auth/signInVerify/index.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import type { IInviteMemberRequest, IInviteMemberResponse } from "@tayemno/shared";
import { inviteMember } from "../../../services/members";

export const inviteMemberRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { workspaceId: string };
    Body: IInviteMemberRequest;
  }>("/", async (request, reply): Promise<IInviteMemberResponse> => {
    try {
      const member = await inviteMember({
        db: app.db,
        requestingUserId: request.user.sub,
        workspaceId: request.params.workspaceId,
        data: request.body,
        mailTransport: app.mailTransport,
        smtpFrom: app.config.SMTP_FROM,
        frontendUrl: app.config.FRONTEND_URL,
      });

      return reply.status(201).send({ member });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

**New file:** `packages/backend/src/routes/members/listMembers/index.ts`

```typescript
import type { FastifyInstance } from "fastify";
import type { IListMembersResponse } from "@tayemno/shared";
import { listMembers } from "../../../services/members";

export const listMembersRoute = async (app: FastifyInstance) => {
  app.get<{
    Params: { workspaceId: string };
  }>("/", async (request, reply): Promise<IListMembersResponse> => {
    try {
      const members = await listMembers({
        db: app.db,
        requestingUserId: request.user.sub,
        workspaceId: request.params.workspaceId,
      });

      return { members };
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

**New file:** `packages/backend/src/routes/members/deleteMember/index.ts`

```typescript
import type { FastifyInstance } from "fastify";
import type { IDeleteMemberResponse } from "@tayemno/shared";
import { deleteMember } from "../../../services/members";

export const deleteMemberRoute = async (app: FastifyInstance) => {
  app.delete<{
    Params: { workspaceId: string; memberId: string };
  }>("/:memberId", async (request, reply): Promise<IDeleteMemberResponse> => {
    try {
      const result = await deleteMember({
        db: app.db,
        requestingUserId: request.user.sub,
        workspaceId: request.params.workspaceId,
        memberId: request.params.memberId,
      });

      return result;
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

**New file:** `packages/backend/src/routes/members/reinviteMember/index.ts`

```typescript
import type { FastifyInstance } from "fastify";
import type { IReinviteMemberRequest, IReinviteMemberResponse } from "@tayemno/shared";
import { reinviteMember } from "../../../services/members";

export const reinviteMemberRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { workspaceId: string; memberId: string };
    Body: IReinviteMemberRequest;
  }>("/:memberId/reinvite", async (request, reply): Promise<IReinviteMemberResponse> => {
    try {
      const result = await reinviteMember({
        db: app.db,
        requestingUserId: request.user.sub,
        workspaceId: request.params.workspaceId,
        memberId: request.params.memberId,
        data: request.body,
        mailTransport: app.mailTransport,
        smtpFrom: app.config.SMTP_FROM,
        frontendUrl: app.config.FRONTEND_URL,
      });

      return result;
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

---

### 16. Create `changePassword` auth route

**New file:** `packages/backend/src/routes/auth/changePassword/index.ts`

This route needs authentication (unlike other auth routes). Use `preHandler` for authenticate.

```typescript
import type { FastifyInstance } from "fastify";
import type { IChangePasswordRequest, IChangePasswordResponse } from "@tayemno/shared";
import { changePassword } from "../../../services/auth";
import { authenticate } from "../../../utils/authenticate";

export const changePasswordRoute = async (app: FastifyInstance) => {
  app.post<{ Body: IChangePasswordRequest }>(
    "/change-password",
    { preHandler: authenticate },
    async (request, reply): Promise<IChangePasswordResponse> => {
      try {
        const result = await changePassword({
          db: app.db,
          userId: request.user.sub,
          data: request.body,
        });

        return result;
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
```

**Update auth routes index:** `packages/backend/src/routes/auth/index.ts`

Before:
```typescript
import { signInVerifyRoute } from "./signInVerify";

export const authRoutes = async (app: FastifyInstance) => {
  await app.register(registerRoute);
  await app.register(verifyEmailRoute);
  await app.register(resendVerificationRoute);
  await app.register(signInInitRoute);
  await app.register(signInVerifyRoute);
};
```

After:
```typescript
import { signInVerifyRoute } from "./signInVerify";
import { changePasswordRoute } from "./changePassword";

export const authRoutes = async (app: FastifyInstance) => {
  await app.register(registerRoute);
  await app.register(verifyEmailRoute);
  await app.register(resendVerificationRoute);
  await app.register(signInInitRoute);
  await app.register(signInVerifyRoute);
  await app.register(changePasswordRoute);
};
```

---

### 17. Register members routes in server

**File:** `packages/backend/src/index.ts`

**17a.** Add import:

After:
```typescript
import { vaultsRoutes } from "./routes/vaults";
```

Add:
```typescript
import { membersRoutes } from "./routes/members";
```

**17b.** Register the routes (after the vaults routes registration):

After:
```typescript
await app.register(vaultsRoutes, {
  prefix: "/workspaces/:workspaceId/vaults",
});
```

Add:
```typescript
await app.register(membersRoutes, {
  prefix: "/workspaces/:workspaceId/members",
});
```

---

### 18. Update `verifyEmail` service to set status on workspace member

**File:** `packages/backend/src/services/auth/verifyEmail/index.ts`

The existing `verifyEmail` creates workspace members for self-registered users. These should have `status: "active"` (the default). Since the schema default is `"active"`, no change is needed here. Verify by checking the `workspaceMembersRepo.create` call — it should work correctly with the default.

No code change required for this step — just verify the default applies.
