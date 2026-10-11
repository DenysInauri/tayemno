import { drawToThumbnail } from "../drawToThumbnail";

const VIDEO_SEEK_TIME = 1;

export const generateVideoThumbnail = (file: File): Promise<Blob | null> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(VIDEO_SEEK_TIME, video.duration);
    };

    video.onseeked = async () => {
      const blob = await drawToThumbnail(
        video,
        video.videoWidth,
        video.videoHeight,
      );
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    video.src = objectUrl;
  });
