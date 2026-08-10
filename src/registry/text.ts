/**
 * Text/binary handling shared by the filesystem registry and the ingestion layer.
 *
 * External capabilities may ship images, fonts, PDFs or archives. Those bytes are
 * never decoded as UTF-8: they are identified, measured and hashed, but their
 * content is not indexed.
 */

const MIME_TYPES: Record<string, string> = {
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  jsonc: "application/json",
  yaml: "text/yaml",
  yml: "text/yaml",
  toml: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  ts: "text/typescript",
  tsx: "text/typescript",
  jsx: "text/javascript",
  py: "text/x-python",
  sh: "text/x-shellscript",
  bash: "text/x-shellscript",
  rb: "text/x-ruby",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  pdf: "application/pdf",
  zip: "application/zip",
  gz: "application/gzip",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

/** Extensions we refuse to decode even when the bytes happen to be valid UTF-8. */
const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "ico",
  "pdf",
  "zip",
  "gz",
  "tgz",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp4",
  "webm",
  "mov",
  "mp3",
  "wav",
  "wasm",
  "so",
  "dylib",
  "dll",
  "exe",
  "bin",
]);

export function extensionOf(path: string): string {
  const base = path.split("/").at(-1) || path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function mimeTypeFor(path: string): string {
  const extension = extensionOf(path);
  return MIME_TYPES[extension] || (isBinaryExtension(path) ? "application/octet-stream" : "text/plain");
}

export function isBinaryExtension(path: string): boolean {
  return BINARY_EXTENSIONS.has(extensionOf(path));
}

/**
 * Decodes bytes as strict UTF-8. Returns `undefined` when the file is binary,
 * either by extension, by NUL byte, or because the bytes are not valid UTF-8.
 */
export function decodeTextContent(path: string, bytes: Uint8Array): string | undefined {
  if (isBinaryExtension(path)) return undefined;

  const probe = bytes.subarray(0, Math.min(bytes.length, 8000));
  if (probe.includes(0)) return undefined;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

export function countLines(text: string): number {
  return text.split("\n").length;
}
