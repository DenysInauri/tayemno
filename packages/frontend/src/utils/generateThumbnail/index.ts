const MAX_SIZE = 128;
const JPEG_QUALITY = 0.7;

export const generateThumbnail = (file: File): Promise<Blob | null> => {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height, 1);
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          resolve(blob);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
};
