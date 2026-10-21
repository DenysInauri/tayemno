# Phase 1 — Backend: Encrypted Audit Log Store

Small-to-medium phase: 1 new DB table, 1 new repository, 2 new services, 2 new routes, edits to 2 existing files (schema + main index). The backend is a dumb encrypted store — no business logic around audit log content.

**Why this approach is sufficient — don't add anything beyond this:** The backend receives opaque encrypted blobs from the frontend and stores them. It does not validate, parse, or understand the payload content. It only provides storage scoped by `workspace_id`, `folder_id`, `vault_id`, and `created_at`. No action-type enums, no actor resolution, no resource name lookups on the backend.

---

## Step 1: Add `auditLogs` table to schema

**File:** `packages/backend/src/db/schema.ts`

Append after the `vaults` table definition (after line 199):

```typescript
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id"),
  vaultId: uuid("vault_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  encryptedPayload: text("encrypted_payload").notNull(),
  payloadNonce: text("payload_nonce").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

Key decisions in this schema:
- **No FK on `folderId`/`vaultId`** — folders and vaults can be deleted; audit logs must persist after deletion.
- **`onDelete: "cascade"` on `workspaceId`** — if the workspace is deleted, all its audit logs go with it (matches folders, vaults, workspaceMembers pattern).
- **No `updatedAt`** — audit logs are immutable.
- **`ipAddress` VARCHAR(45)** — max IPv6 representation length.
- **No `actorId`** — actor identity is inside the encrypted payload. The server already knows the user from JWT but does not correlate it with audit log content.

## Step 2: Generate Drizzle migration

Run from `packages/backend`:

```bash
npm run db:generate
```

This creates a new migration folder in `packages/backend/drizzle/` with the SQL for the `audit_logs` table.

Verify the generated SQL creates the table with the correct columns and the FK constraint on `workspace_id`.

Then apply:

```bash
npm run db:migrate
```

## Step 3: Add shared types

**File:** `packages/shared/src/index.ts`

Append at the end of the file:

```typescript
export type AuditAction =
  | "folder.opened"
  | "folder.created"
  | "vault.created"
  | "vault.deleted"
  | "vault.moved_from"
  | "vault.moved_to"
  | "folder.moved_from"
  | "folder.moved_to"
  | "vault.previewed"
  | "vault.downloaded"
  | "folder_acl.created";

export interface IAuditLogPayload {
  action: AuditAction;
  actorName: string;
  actorEmail: string;
  context?: {
    folderName?: string;
    vaultName?: string;
    targetFolderName?: string;
    sourceFolderName?: string;
    movedFolderName?: string;
    memberName?: string;
    memberEmail?: string;
  };
}

export interface ICreateAuditLogRequest {
  folderId: string | null;
  vaultId?: string | null;
  encryptedPayload: string;
  payloadNonce: string;
  encryptedKey: string;
}

export interface ICreateAuditLogResponse {
  id: string;
  createdAt: string;
}

export interface IAuditLogEntry {
  id: string;
  folderId: string | null;
  vaultId: string | null;
  ipAddress: string | null;
  encryptedPayload: string;
  payloadNonce: string;
  encryptedKey: string;
  createdAt: string;
}

export interface IGetAuditLogsResponse {
  logs: IAuditLogEntry[];
  nextCursor: string | null;
}
```

Note: `AuditAction` and `IAuditLogPayload` are technically frontend-only types (the backend never sees decrypted payloads), but placing them in shared keeps all audit log types co-located.

## Step 4: Create audit logs repository

**New file:** `packages/backend/src/repositories/auditLogs/index.ts`

Follow the pattern of existing repositories (e.g., `repositories/folders/index.ts`). Use raw SQL via `db.execute(sql`...`)` for the paginated queries.

```typescript
import { sql } from "drizzle-orm";
import type { Database } from "../../db";
import { auditLogs } from "../../db/schema.js";

interface ICreateParams {
  workspaceId: string;
  folderId: string | null;
  vaultId?: string | null;
  ipAddress: string | null;
  encryptedPayload: string;
  payloadNonce: string;
  encryptedKey: string;
}

export const create = async (db: Database, data: ICreateParams) => {
  const result = await db
    .insert(auditLogs)
    .values({
      workspaceId: data.workspaceId,
      folderId: data.folderId,
      vaultId: data.vaultId ?? null,
      ipAddress: data.ipAddress,
      encryptedPayload: data.encryptedPayload,
      payloadNonce: data.payloadNonce,
      encryptedKey: data.encryptedKey,
    })
    .returning();
  return result[0];
};

export const findByFolderId = async (
  db: Database,
  workspaceId: string,
  folderId: string | null,
  cursor: string | null,
  limit: number,
) => {
  const folderCondition = folderId
    ? sql`al.folder_id = ${folderId}`
    : sql`al.folder_id IS NULL`;

  const cursorCondition = cursor
    ? sql`AND al.created_at < ${cursor}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT al.id,
           al.folder_id AS "folderId",
           al.vault_id AS "vaultId",
           al.ip_address AS "ipAddress",
           al.encrypted_payload AS "encryptedPayload",
           al.payload_nonce AS "payloadNonce",
           al.encrypted_key AS "encryptedKey",
           al.created_at AS "createdAt"
    FROM audit_logs al
    WHERE al.workspace_id = ${workspaceId}
      AND ${folderCondition}
      ${cursorCondition}
    ORDER BY al.created_at DESC
    LIMIT ${limit + 1}
  `);

  const results = rows as unknown as any[];
  const hasMore = results.length > limit;
  const logs = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore
    ? (logs[logs.length - 1].createdAt instanceof Date
        ? logs[logs.length - 1].createdAt.toISOString()
        : logs[logs.length - 1].createdAt)
    : null;

  return { logs, nextCursor };
};

export const findByVaultId = async (
  db: Database,
  workspaceId: string,
  vaultId: string,
  cursor: string | null,
  limit: number,
) => {
  const cursorCondition = cursor
    ? sql`AND al.created_at < ${cursor}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT al.id,
           al.folder_id AS "folderId",
           al.vault_id AS "vaultId",
           al.ip_address AS "ipAddress",
           al.encrypted_payload AS "encryptedPayload",
           al.payload_nonce AS "payloadNonce",
           al.encrypted_key AS "encryptedKey",
           al.created_at AS "createdAt"
    FROM audit_logs al
    WHERE al.workspace_id = ${workspaceId}
      AND al.vault_id = ${vaultId}
      ${cursorCondition}
    ORDER BY al.created_at DESC
    LIMIT ${limit + 1}
  `);

  const results = rows as unknown as any[];
  const hasMore = results.length > limit;
  const logs = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore
    ? (logs[logs.length - 1].createdAt instanceof Date
        ? logs[logs.length - 1].createdAt.toISOString()
        : logs[logs.length - 1].createdAt)
    : null;

  return { logs, nextCursor };
};
```

Pagination approach: fetch `limit + 1` rows. If we get more than `limit`, there's a next page. The cursor is the `createdAt` of the last returned row. This is the standard cursor pattern.

## Step 5: Create audit logs services

**New file:** `packages/backend/src/services/auditLogs/createAuditLog/index.ts`

```typescript
import type { Database } from "../../../db";
import type {
  ICreateAuditLogRequest,
  ICreateAuditLogResponse,
} from "@tayemno/shared";
import * as auditLogsRepo from "../../../repositories/auditLogs";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";

export const createAuditLog = async (
  db: Database,
  userId: string,
  workspaceId: string,
  ipAddress: string,
  data: ICreateAuditLogRequest,
): Promise<ICreateAuditLogResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(
    db,
    workspaceId,
    userId,
  );

  if (!membership) {
    throw new HttpError(403, "Access denied");
  }

  const log = await auditLogsRepo.create(db, {
    workspaceId,
    folderId: data.folderId,
    vaultId: data.vaultId ?? null,
    ipAddress,
    encryptedPayload: data.encryptedPayload,
    payloadNonce: data.payloadNonce,
    encryptedKey: data.encryptedKey,
  });

  return {
    id: log.id,
    createdAt:
      log.createdAt instanceof Date
        ? log.createdAt.toISOString()
        : log.createdAt,
  };
};
```

**New file:** `packages/backend/src/services/auditLogs/getAuditLogs/index.ts`

```typescript
import type { Database } from "../../../db";
import type { IGetAuditLogsResponse } from "@tayemno/shared";
import * as auditLogsRepo from "../../../repositories/auditLogs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const toISO = (val: Date | string): string =>
  val instanceof Date ? val.toISOString() : val;

export const getAuditLogs = async (
  db: Database,
  workspaceId: string,
  folderId: string | undefined,
  vaultId: string | undefined,
  cursor: string | undefined,
  limit: number | undefined,
): Promise<IGetAuditLogsResponse> => {
  const effectiveLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  if (vaultId) {
    const result = await auditLogsRepo.findByVaultId(
      db,
      workspaceId,
      vaultId,
      cursor ?? null,
      effectiveLimit,
    );
    return {
      logs: result.logs.map((r: any) => ({ ...r, createdAt: toISO(r.createdAt) })),
      nextCursor: result.nextCursor,
    };
  }

  const result = await auditLogsRepo.findByFolderId(
    db,
    workspaceId,
    folderId ?? null,
    cursor ?? null,
    effectiveLimit,
  );

  return {
    logs: result.logs.map((r: any) => ({ ...r, createdAt: toISO(r.createdAt) })),
    nextCursor: result.nextCursor,
  };
};
```

Note: `getAuditLogs` does NOT check admin/owner — that's handled by the `authorizeAdmin` hook at the route level (matches the `members` routes pattern where `authorizeAdmin` is a group-level hook).

**New file:** `packages/backend/src/services/auditLogs/index.ts`

```typescript
export { createAuditLog } from "./createAuditLog";
export { getAuditLogs } from "./getAuditLogs";
```

## Step 6: Create audit logs routes

**New file:** `packages/backend/src/routes/auditLogs/createAuditLog/index.ts`

Follow the exact pattern of `routes/folders/createFolder/index.ts`. The key difference: passes `request.ip` to the service.

```typescript
import type { FastifyInstance } from "fastify";
import type {
  ICreateAuditLogRequest,
  ICreateAuditLogResponse,
} from "@tayemno/shared";
import { createAuditLog } from "../../../services/auditLogs";

export const createAuditLogRoute = async (app: FastifyInstance) => {
  app.post<{
    Params: { workspaceId: string };
    Body: ICreateAuditLogRequest;
  }>("/", async (request, reply): Promise<ICreateAuditLogResponse> => {
    try {
      return await createAuditLog(
        app.db,
        request.user.sub,
        request.params.workspaceId,
        request.ip,
        request.body,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

**New file:** `packages/backend/src/routes/auditLogs/getAuditLogs/index.ts`

The `authorizeAdmin` hook is added at this plugin level — only the GET endpoint requires admin/owner. Follow the pattern of `routes/folders/bulkCreateFolderAcl/index.ts` which adds `authorizeAdmin` as a per-plugin hook.

```typescript
import type { FastifyInstance } from "fastify";
import type { IGetAuditLogsResponse } from "@tayemno/shared";
import { authorizeAdmin } from "../../../utils/authorizeAdmin";
import { getAuditLogs } from "../../../services/auditLogs";

export const getAuditLogsRoute = async (app: FastifyInstance) => {
  app.addHook("onRequest", authorizeAdmin);

  app.get<{
    Params: { workspaceId: string };
    Querystring: {
      folderId?: string;
      vaultId?: string;
      cursor?: string;
      limit?: string;
    };
  }>("/", async (request, reply): Promise<IGetAuditLogsResponse> => {
    try {
      return await getAuditLogs(
        app.db,
        request.params.workspaceId,
        request.query.folderId,
        request.query.vaultId,
        request.query.cursor,
        request.query.limit ? parseInt(request.query.limit, 10) : undefined,
      );
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        message: err.message || "Internal server error",
      });
    }
  });
};
```

**New file:** `packages/backend/src/routes/auditLogs/index.ts`

Follow the pattern of `routes/folders/index.ts` — group-level hooks for authentication.

```typescript
import type { FastifyInstance } from "fastify";
import { authenticate } from "../../utils/authenticate";
import { requirePasswordChanged } from "../../utils/requirePasswordChanged";
import { createAuditLogRoute } from "./createAuditLog";
import { getAuditLogsRoute } from "./getAuditLogs";

export const auditLogsRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);
  app.addHook("onRequest", requirePasswordChanged);

  await app.register(createAuditLogRoute);
  await app.register(getAuditLogsRoute);
};
```

## Step 7: Register audit logs routes in main index

**File:** `packages/backend/src/index.ts`

Add import (after line 15, alongside other route imports):

```typescript
import { auditLogsRoutes } from "./routes/auditLogs";
```

Add registration (after line 78, after `membersRoutes`):

```typescript
await app.register(auditLogsRoutes, {
  prefix: "/workspaces/:workspaceId/audit-logs",
});
```

## Verification

1. `npm run build` in `packages/backend` — should compile without errors.
2. `npm run build` in `packages/shared` — should compile without errors.
3. `npm run db:generate` in `packages/backend` — migration should be generated (if not already done in Step 2).
4. Check `git diff` — should only show changes in:
   - `packages/backend/src/db/schema.ts`
   - `packages/backend/src/index.ts`
   - `packages/shared/src/index.ts`
   - `packages/backend/drizzle/<new-migration>/` (new)
   - `packages/backend/src/repositories/auditLogs/index.ts` (new)
   - `packages/backend/src/services/auditLogs/` (3 new files)
   - `packages/backend/src/routes/auditLogs/` (3 new files)
