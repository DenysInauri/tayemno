import { useEffect } from "react";

export const useKeyboard = (options: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!options[e.key]) return;
      if (typeof options[e.key] !== "function") return;
      options[e.key]();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options]);
};
