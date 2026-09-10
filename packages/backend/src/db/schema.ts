import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  bigint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
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

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): any => folders.id, {
    onDelete: "cascade",
  }),

  name: varchar("name", { length: 255 }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const vaults = pgTable("vaults", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, {
    onDelete: "cascade",
  }),

  // Open metadata for search/filtering
  name: varchar("name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  extension: varchar("extension", { length: 64 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),

  // Encrypted content location
  s3Key: text("s3_key").notNull(),
  contentNonce: text("content_nonce").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
