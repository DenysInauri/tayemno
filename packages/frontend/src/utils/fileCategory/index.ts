import { FileCategoryEnum } from "../../enums/files/FileCategoryEnum";

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "apng", "avif",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4", "webm", "ogv", "mov", "mkv", "avi", "m4v",
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma",
]);

const TEXT_EXTENSIONS = new Set([
  "txt", "csv", "json", "xml", "yaml", "yml", "toml", "ini", "cfg", "conf",
  "log", "md", "html", "htm", "css", "scss", "less", "js", "jsx", "ts",
  "tsx", "mjs", "cjs", "py", "rb", "go", "rs", "java", "kt", "c", "cpp",
  "h", "hpp", "cs", "php", "sh", "bash", "zsh", "sql", "graphql",
]);

export const getFileCategory = (extension: string): FileCategoryEnum => {
  const ext = extension.toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return FileCategoryEnum.IMAGE;
  if (ext === "pdf") return FileCategoryEnum.PDF;
  if (VIDEO_EXTENSIONS.has(ext)) return FileCategoryEnum.VIDEO;
  if (AUDIO_EXTENSIONS.has(ext)) return FileCategoryEnum.AUDIO;
  if (TEXT_EXTENSIONS.has(ext)) return FileCategoryEnum.TEXT;
  return FileCategoryEnum.OTHER;
};
