import { useState, useEffect } from "react";

import type { ILocalVault } from "../../../types/local";
import { useAuth } from "../../../contexts/AuthContext";
import { getVaultDownloadUrl } from "../../../api/hooks/useGetVaultDownloadUrl";
import { registerPreview, getPreviewUrl } from "../../../utils/serviceWorker";

interface IUsePreviewResult {
  url: string | null;
  isLoading: boolean;
  error: string | null;
}

const cache = new Map<string, string>();

export const usePreview = (vault: ILocalVault | null): IUsePreviewResult => {
  const { workspace } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vault || !workspace) {
      setUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cached = cache.get(vault.id);
    if (cached) {
      setUrl(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    const id = crypto.randomUUID();
    setUrl(null);
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();

    (async () => {
      try {
        const presignedUrl = await getVaultDownloadUrl(workspace.id, vault.id);

        if (controller.signal.aborted) return;

        const ok = await registerPreview(
          id,
          presignedUrl,
          vault.symmetricKey,
          vault.contentNonce,
          vault.mimeType,
        );

        if (controller.signal.aborted) return;

        if (!ok) {
          setError("Service worker registration failed");
          setIsLoading(false);
          return;
        }

        const previewUrl = getPreviewUrl(id);
        cache.set(vault.id, previewUrl);
        setUrl(previewUrl);
        setIsLoading(false);
      } catch {
        if (!controller.signal.aborted) {
          setError("Failed to load preview");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [vault?.id, workspace?.id]);

  return { url, isLoading, error };
};
