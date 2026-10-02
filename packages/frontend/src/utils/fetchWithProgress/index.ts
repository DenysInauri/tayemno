export const fetchWithProgress = async (
  url: string,
  onProgress?: (ratio: number) => void,
): Promise<Blob> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const contentLength = response.headers.get("Content-Length");

  if (!contentLength || !response.body || !onProgress) {
    return response.blob();
  }

  const total = parseInt(contentLength, 10);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    loaded += value.byteLength;
    onProgress(loaded / total);
  }

  return new Blob(chunks.map((c) => c as BlobPart));
};
