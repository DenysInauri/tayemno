import { generateImageThumbnail } from "./generateImageThumbnail";
import { generateVideoThumbnail } from "./generateVideoThumbnail";

export const generateThumbnail = (file: File): Promise<Blob | null> => {
  if (file.type.startsWith("image/")) return generateImageThumbnail(file);
  if (file.type.startsWith("video/")) return generateVideoThumbnail(file);
  return Promise.resolve(null);
};
