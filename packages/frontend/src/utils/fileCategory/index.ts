export type FileCategory = "image" | "other";

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "apng", "avif",
]);

export const getFileCategory = (extension: string): FileCategory =>
  IMAGE_EXTENSIONS.has(extension.toLowerCase()) ? "image" : "other";
