export interface ILocalFolder {
  id: string;
  parentFolderId: string | null;
  workspaceId: string;
  name: string;
  symmetricKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ILocalVault {
  id: string;
  folderId: string | null;
  workspaceId: string;
  name: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  encryptedSizeBytes: number;
  s3Key: string;
  contentNonce: string;
  symmetricKey: string;
  createdAt: string;
  updatedAt: string;
}
