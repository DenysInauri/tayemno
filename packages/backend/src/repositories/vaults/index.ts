import { eq, and, isNull, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { vaults } from "../../db/schema.js";

export const create = async (
  db: Database,
  data: typeof vaults.$inferInsert,
) => {
  const result = await db.insert(vaults).values(data).returning();
  return result[0];
};

export const findByFolderId = async (db: Database, folderId: string) => {
  return db
    .select()
    .from(vaults)
    .where(eq(vaults.folderId, folderId));
};

export const findByWorkspaceIdRootLevel = async (
  db: Database,
  workspaceId: string,
) => {
  return db
    .select()
    .from(vaults)
    .where(and(eq(vaults.workspaceId, workspaceId), isNull(vaults.folderId)));
};

export const findById = async (db: Database, vaultId: string) => {
  const result = await db
    .select()
    .from(vaults)
    .where(eq(vaults.id, vaultId))
    .limit(1);

  return result[0] ?? null;
};

export const deleteById = async (db: Database, vaultId: string) => {
  await db.delete(vaults).where(eq(vaults.id, vaultId));
};

interface IUpdateMoveData {
  folderId: string | null;
  encryptedSymmetricKey: string;
  symmetricKeyNonce: string | null;
}

export const updateMove = async (
  db: Database,
  vaultId: string,
  data: IUpdateMoveData,
) => {
  const result = await db
    .update(vaults)
    .set({
      folderId: data.folderId,
      encryptedSymmetricKey: data.encryptedSymmetricKey,
      symmetricKeyNonce: data.symmetricKeyNonce,
    })
    .where(eq(vaults.id, vaultId))
    .returning();

  return result[0] ?? null;
};

export const findByFolderAndUser = async (
  db: Database,
  workspaceId: string,
  folderId: string | null,
  userId: string,
) => {
  if (folderId) {
    const rows = await db.execute(sql`
      SELECT v.id, v.workspace_id AS "workspaceId", v.folder_id AS "folderId",
             v.encrypted_name AS "encryptedName", v.name_nonce AS "nameNonce",
             v.encrypted_metadata AS "encryptedMetadata", v.metadata_nonce AS "metadataNonce",

             v.s3_key AS "s3Key", v.content_nonce AS "contentNonce",
             v.encrypted_symmetric_key AS "encryptedSymmetricKey",
             v.symmetric_key_nonce AS "symmetricKeyNonce",
             v.thumbnail_s3_key AS "thumbnailS3Key",
             v.thumbnail_nonce AS "thumbnailNonce",
             v.created_at AS "createdAt", v.updated_at AS "updatedAt"
      FROM vaults v
      WHERE v.folder_id = ${folderId}
      AND EXISTS (SELECT 1 FROM folder_acls fa WHERE fa.folder_id = ${folderId} AND fa.user_id = ${userId})
    `);
    return rows;
  }

  const rows = await db.execute(sql`
    SELECT v.id, v.workspace_id AS "workspaceId", v.folder_id AS "folderId",
           v.encrypted_name AS "encryptedName", v.name_nonce AS "nameNonce",
           v.encrypted_metadata AS "encryptedMetadata", v.metadata_nonce AS "metadataNonce",

           v.s3_key AS "s3Key", v.content_nonce AS "contentNonce",
           v.encrypted_symmetric_key AS "encryptedSymmetricKey",
           v.symmetric_key_nonce AS "symmetricKeyNonce",
           v.thumbnail_s3_key AS "thumbnailS3Key",
           v.thumbnail_nonce AS "thumbnailNonce",
           v.created_at AS "createdAt", v.updated_at AS "updatedAt"
    FROM vaults v
    WHERE v.workspace_id = ${workspaceId}
    AND v.folder_id IS NULL
    AND EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${userId})
  `);
  return rows;
};

export const findAllByWorkspaceAndUser = async (
  db: Database,
  workspaceId: string,
  userId: string,
) => {
  const rows = await db.execute(sql`
    SELECT v.id, v.workspace_id AS "workspaceId", v.folder_id AS "folderId",
           v.encrypted_name AS "encryptedName", v.name_nonce AS "nameNonce",
           v.encrypted_metadata AS "encryptedMetadata", v.metadata_nonce AS "metadataNonce",

           v.s3_key AS "s3Key", v.content_nonce AS "contentNonce",
           v.encrypted_symmetric_key AS "encryptedSymmetricKey",
           v.symmetric_key_nonce AS "symmetricKeyNonce",
           v.thumbnail_s3_key AS "thumbnailS3Key",
           v.thumbnail_nonce AS "thumbnailNonce",
           v.created_at AS "createdAt", v.updated_at AS "updatedAt"
    FROM vaults v
    WHERE v.workspace_id = ${workspaceId}
    AND EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = ${workspaceId} AND wm.user_id = ${userId})
    AND (
      v.folder_id IS NULL
      OR v.folder_id IN (SELECT fa.folder_id FROM folder_acls fa WHERE fa.user_id = ${userId})
    )
  `);
  return rows;
};
