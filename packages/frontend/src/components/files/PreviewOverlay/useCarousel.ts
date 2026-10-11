import { useState, useCallback } from "react";

import type { ILocalVault } from "../../../types/local";
import { useKeyboard } from "../../../hooks/useKeyboard";

export const useCarousel = (vaults: ILocalVault[]) => {
  const [vault, setVault] = useState<ILocalVault | null>(null);

  const currentIndex = vault
    ? vaults.findIndex((v) => v.id === vault.id)
    : -1;

  const open = useCallback((v: ILocalVault) => setVault(v), []);
  const close = useCallback(() => setVault(null), []);

  const prev = useCallback(() => {
    if (vaults.length <= 1 || currentIndex < 0) return;
    const prevIndex =
      currentIndex === 0 ? vaults.length - 1 : currentIndex - 1;
    setVault(vaults[prevIndex]);
  }, [vaults, currentIndex]);

  const next = useCallback(() => {
    if (vaults.length <= 1 || currentIndex < 0) return;
    const nextIndex =
      currentIndex === vaults.length - 1 ? 0 : currentIndex + 1;
    setVault(vaults[nextIndex]);
  }, [vaults, currentIndex]);

  useKeyboard({ ArrowLeft: prev, ArrowRight: next });

  return { vault, currentIndex, open, close, prev, next };
};
