const MAX_SIZE = 128;
const JPEG_QUALITY = 0.7;

export const drawToThumbnail = (
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
): Promise<Blob | null> => {
  const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height, 1);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.drawImage(source, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY);
  });
};
