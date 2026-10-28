import { useState, useEffect } from "react";

interface IUseTextContentResult {
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useTextContent = (url: string): IUseTextContentResult => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => res.text())
      .then((text) => {
        if (text.includes("\0")) {
          setError("binary");
        } else {
          setContent(text);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [url]);

  return { content, isLoading, error };
};
