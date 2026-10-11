export const SW_MSG_REGISTER_PREVIEW = "REGISTER_PREVIEW";
export const SW_MSG_DEREGISTER_PREVIEW = "DEREGISTER_PREVIEW";

export const SW_FILE_PREFIX = "/sw/file/";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
  "image/apng",
  "image/avif",
]);

export const isAllowedInlineContentType = (ct: string): boolean =>
  ALLOWED_IMAGE_TYPES.has(ct.toLowerCase());

export interface ISwPreviewRegistration {
  type: typeof SW_MSG_REGISTER_PREVIEW;
  id: string;
  presignedUrl: string;
  keyHex: string;
  contentNonce: string;
  contentType: string;
}

export interface ISwPreviewDeregistration {
  type: typeof SW_MSG_DEREGISTER_PREVIEW;
  id: string;
}
