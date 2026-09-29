# Phase 1: S3 + Backend Vault Endpoints

**Size:** ~10 new/modified files across backend + shared. No frontend changes.

**Why this approach is sufficient:** This phase sets up the infrastructure (S3 client, presigned URLs) and the vault CRUD. It does NOT touch the frontend or encryption — that's Phase 2. Don't add upload validation, file type checks, or streaming logic here.

## Steps

### 1. Remove `encryptedName` from schema and shared types

**File:** `packages/backend/src/db/schema.ts:134`

Remove:
```ts
encryptedName: text("encrypted_name").notNull(),
```

**File:** `packages/shared/src/index.ts`

Remove `encryptedName` from `Vault` interface (line 79) and `NewVault` interface (line 94).

After editing, run `drizzle-kit push` to sync dev DB.

### 2. Install S3 SDK on backend

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner -w packages/backend
```

### 3. Add R2 environment variables

**File:** `packages/backend/src/config.ts`

Add to `schema.properties`:
```ts
S3_ENDPOINT: { type: "string" },
S3_REGION: { type: "string", default: "auto" },
S3_ACCESS_KEY_ID: { type: "string" },
S3_SECRET_ACCESS_KEY: { type: "string" },
S3_BUCKET: { type: "string" },
```

Add `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` to the `required` array.

Add the same fields to the `Config` type.

**File:** `.env`

Add placeholder values (actual R2 credentials to be configured manually):
```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=tayemno-vaults
```

### 4. Create S3 client utility

**New file:** `packages/backend/src/utils/s3/index.ts`

Pattern: follow `packages/backend/src/utils/httpError/index.ts` (utility module).

```ts
import { S3Client } from "@aws-sdk/client-s3";

export const createS3Client = (config: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}) => {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export type S3 = S3Client;
```

### 5. Register S3 client on Fastify instance

**File:** `packages/backend/src/index.ts`

Add to `FastifyInstance` declaration (next to `db` and `mailTransport`):
```ts
s3: S3;
```

After `app.decorate("db", ...)`, add:
```ts
app.decorate("s3", createS3Client({
  endpoint: app.config.S3_ENDPOINT,
  region: app.config.S3_REGION,
  accessKeyId: app.config.S3_ACCESS_KEY_ID,
  secretAccessKey: app.config.S3_SECRET_ACCESS_KEY,
}));
```

Import `createS3Client` and `S3` type from `./utils/s3`.

### 6. Add shared request/response interfaces

**File:** `packages/shared/src/index.ts`

Append:
```ts
export interface IPresignVaultRequest {
  folderId: string;
  fileName: string;
  mimeType: string;
}

export interface IPresignVaultResponse {
  presignedUrl: string;
  s3Key: string;
}

export interface ICreateVaultRequest {
  folderId: string;
  name: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  s3Key: string;
  contentNonce: string;
  symmetricKey: string;
}

export interface ICreateVaultResponse {
  vault: Vault;
}
```

### 7. Create vault repository

**New file:** `packages/backend/src/repositories/vaults/index.ts`

Pattern: copy from `packages/backend/src/repositories/folders/index.ts`.

```ts
import type { Database } from "../../db";
import { vaults } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof vaults.$inferInsert,
) => {
  const result = await db.insert(vaults).values(data).returning();
  return result[0];
};
```

### 8. Create presignVault service

**New file:** `packages/backend/src/services/vaults/presignVault/index.ts`

Pattern: copy structure from `packages/backend/src/services/folders/createFolder/index.ts`.

- Receives `s3: S3`, `bucket: string`, `db: Database`, `userId: string`, `data: IPresignVaultRequest`
- Verify the user has a `folderKeyShare` for the requested `folderId` (use `findByFolderIdAndUserId` — needs to be re-added to `repositories/folderKeyShares`)
- If no access → `throw new HttpError(403, "Access denied")`
- Generate `s3Key` as `vaults/${uuid()}/${data.fileName}` (using `crypto.randomUUID()`)
- Create presigned PUT URL using `@aws-sdk/s3-request-presigner`:
  ```ts
  import { PutObjectCommand } from "@aws-sdk/client-s3";
  import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: "application/octet-stream",
  });
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  ```
- Return `{ presignedUrl, s3Key }`

### 9. Create createVault service

**New file:** `packages/backend/src/services/vaults/createVault/index.ts`

- Receives `db: Database`, `userId: string`, `data: ICreateVaultRequest`
- Verify user has `folderKeyShare` for `data.folderId` → `HttpError(403)` if not
- Insert vault via repository:
  ```ts
  const vault = await insertVault(db, {
    ownerId: userId,
    folderId: data.folderId,
    name: data.name,
    mimeType: data.mimeType,
    extension: data.extension,
    sizeBytes: data.sizeBytes,
    s3Key: data.s3Key,
    contentNonce: data.contentNonce,
    symmetricKey: data.symmetricKey,
  });
  ```
- Return `{ vault }` with Date→string mapping (same `mapX` pattern as createFolder service)

### 10. Create service index

**New file:** `packages/backend/src/services/vaults/index.ts`

```ts
export { presignVault } from "./presignVault";
export { createVault } from "./createVault";
```

### 11. Re-add `findByFolderIdAndUserId` to folderKeyShares repository

**File:** `packages/backend/src/repositories/folderKeyShares/index.ts`

Add back (was removed earlier as unused — now needed for vault access checks):

```ts
export const findByFolderIdAndUserId = async (
  db: Database,
  folderId: string,
  userId: string,
) => {
  const result = await db
    .select()
    .from(folderKeyShares)
    .where(
      and(
        eq(folderKeyShares.folderId, folderId),
        eq(folderKeyShares.userId, userId),
      ),
    )
    .limit(1);

  return result[0];
};
```

Add `and` to the `drizzle-orm` import.

### 12. Create route handlers

**New file:** `packages/backend/src/routes/vaults/presignVault/index.ts`

Pattern: copy from `packages/backend/src/routes/folders/createFolder/index.ts`.

```ts
export const presignVaultRoute = async (app: FastifyInstance) => {
  app.post<{ Body: IPresignVaultRequest }>(
    "/presign",
    async (request, reply): Promise<IPresignVaultResponse> => {
      try {
        return await presignVault(
          app.s3,
          app.config.S3_BUCKET,
          app.db,
          request.user.sub,
          request.body,
        );
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({
          message: err.message || "Internal server error",
        });
      }
    },
  );
};
```

**New file:** `packages/backend/src/routes/vaults/createVault/index.ts`

Same pattern, `POST /`:
```ts
return await createVault(app.db, request.user.sub, request.body);
```

**New file:** `packages/backend/src/routes/vaults/index.ts`

Pattern: copy from `packages/backend/src/routes/folders/index.ts`.

```ts
export const vaultsRoutes = async (app: FastifyInstance) => {
  app.addHook("onRequest", authenticate);

  await app.register(presignVaultRoute);
  await app.register(createVaultRoute);
};
```

### 13. Register vault routes in app

**File:** `packages/backend/src/index.ts`

Add after the folders registration:
```ts
await app.register(vaultsRoutes, { prefix: "/vaults" });
```

Import `vaultsRoutes` from `./routes/vaults`.

### 14. Verify

- `npx tsc --build` in `packages/backend` — no errors
- `npx drizzle-kit push` in `packages/backend` — schema synced
- `git diff` — only expected files changed
