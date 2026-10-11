import { drawToThumbnail } from "../drawToThumbnail";

export const generateImageThumbnail = (file: File): Promise<Blob | null> =>
  new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      const blob = await drawToThumbnail(img, img.width, img.height);
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
