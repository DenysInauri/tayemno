export const downloadBlob = (blob: Blob, filename: string, mimeType?: string) => {
  const file = mimeType ? new Blob([blob], { type: mimeType }) : blob;
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
