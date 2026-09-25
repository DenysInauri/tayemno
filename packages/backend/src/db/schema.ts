import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  bigint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: varchar("name", { length: 255 }).notNull(),

  // SRP authentication
  srpSalt: text("srp_salt").notNull(),
  srpVerifier: text("srp_verifier").notNull(),

  // KDF parameters for local KEK derivation
  kdfSalt: text("kdf_salt").notNull(),
  kdfAlgorithm: varchar("kdf_algorithm", { length: 32 })
    .default("argon2id")
    .notNull(),
  kdfMemoryKib: integer("kdf_memory_kib").notNull(),
  kdfIterations: integer("kdf_iterations").notNull(),
  kdfParallelism: integer("kdf_parallelism").notNull(),

  // Asymmetric keypair for vault_keys / sharing
  publicKey: text("public_key").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  privateKeyNonce: text("private_key_nonce").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const pendingRegistrations = pgTable("pending_registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),

  srpSalt: text("srp_salt").notNull(),
  srpVerifier: text("srp_verifier").notNull(),

  kdfSalt: text("kdf_salt").notNull(),
  kdfAlgorithm: varchar("kdf_algorithm", { length: 32 })
    .default("argon2id")
    .notNull(),
  kdfMemoryKib: integer("kdf_memory_kib").notNull(),
  kdfIterations: integer("kdf_iterations").notNull(),
  kdfParallelism: integer("kdf_parallelism").notNull(),

  publicKey: text("public_key").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  privateKeyNonce: text("private_key_nonce").notNull(),

  workspaceName: varchar("workspace_name", { length: 255 }).notNull(),
  workspaceAdminPublicKey: text("workspace_admin_public_key").notNull(),
  workspaceMemberPublicKey: text("workspace_member_public_key").notNull(),
  encryptedWorkspaceAdminPrivateKey: text("encrypted_workspace_admin_private_key").notNull(),
  encryptedWorkspaceMemberPrivateKey: text("encrypted_workspace_member_private_key").notNull(),

  verificationCodeHash: text("verification_code_hash").notNull(),
  codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  adminPublicKey: text("admin_public_key").notNull(),
  memberPublicKey: text("member_public_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(),
    encryptedAdminPrivateKey: text("encrypted_admin_private_key"),
    encryptedMemberPrivateKey: text("encrypted_member_private_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique().on(t.workspaceId, t.userId)],
);

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  encryptedSymmetricKey: text("encrypted_symmetric_key").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const folderMembers = pgTable(
  "folder_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedSymmetricKey: text("encrypted_symmetric_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique().on(t.folderId, t.userId)],
);

export const vaults = pgTable("vaults", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, {
    onDelete: "cascade",
  }),

  name: varchar("name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  extension: varchar("extension", { length: 64 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),

  s3Key: text("s3_key").notNull(),
  contentNonce: text("content_nonce").notNull(),

  encryptedSymmetricKey: text("encrypted_symmetric_key").notNull(),
  symmetricKeyNonce: text("symmetric_key_nonce"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
