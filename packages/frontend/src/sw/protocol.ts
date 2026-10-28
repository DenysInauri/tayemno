export const SW_MSG_REGISTER_PREVIEW = "REGISTER_PREVIEW";
export const SW_MSG_DEREGISTER_PREVIEW = "DEREGISTER_PREVIEW";

export const SW_FILE_PREFIX = "/sw/file/";

const ALLOWED_PREFIXES = ["image/", "video/", "audio/", "text/"];

const ALLOWED_APPLICATION_TYPES = new Set([
  "application/pdf",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-yaml",
  "application/x-sh",
  "application/sql",
]);

export const isAllowedInlineContentType = (ct: string): boolean => {
  const lower = ct.toLowerCase();
  if (ALLOWED_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true;
  return ALLOWED_APPLICATION_TYPES.has(lower);
};

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
