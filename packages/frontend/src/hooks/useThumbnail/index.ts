import { useState, useEffect } from "react";

import type { ILocalVault } from "../../types/local";
import { axios } from "../../api";
import { EndpointEnum } from "../../enums/api/EndpointEnum";
import { StreamCrypto } from "../../utils/crypto/StreamCrypto";

interface IThumbnailUrlResponse {
  presignedUrl: string;
}

const cache = new Map<string, string>();

export const useThumbnail = (vault: ILocalVault): string | null => {
  const [url, setUrl] = useState<string | null>(
    () => cache.get(vault.id) ?? null,
  );

  useEffect(() => {
    if (!vault.thumbnailS3Key || !vault.thumbnailNonce) return;
    if (cache.has(vault.id)) return;

    let cancelled = false;

    const load = async () => {
      const { data } = await axios.get<IThumbnailUrlResponse>(
        `${EndpointEnum.WORKSPACES}/${vault.workspaceId}${EndpointEnum.VAULTS}/${vault.id}/thumbnail-url`,
      );

      const response = await fetch(data.presignedUrl);
      const encryptedBlob = await response.blob();

      const decryptedBlob = await StreamCrypto.decryptFile(
        encryptedBlob,
        vault.symmetricKey,
        vault.thumbnailNonce!,
      );

      const blobUrl = URL.createObjectURL(decryptedBlob);
      cache.set(vault.id, blobUrl);

      if (!cancelled) {
        setUrl(blobUrl);
      }
    };

    load().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    vault.id,
    vault.thumbnailS3Key,
    vault.thumbnailNonce,
    vault.workspaceId,
    vault.symmetricKey,
  ]);

  return url;
};
