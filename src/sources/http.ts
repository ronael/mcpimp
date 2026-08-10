/**
 * Network access for the ingestion layer.
 *
 * Everything fetched here is untrusted. The rules are enforced in one place:
 * HTTPS only, host allowlist, hard byte caps, request timeouts, and no
 * credentials sent anywhere except api.github.com.
 */

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

const BASE_ALLOWED_HOSTS = new Set(["api.github.com", "raw.githubusercontent.com", "github.com"]);

const USER_AGENT = "mcpimp-source-sync";

export class SourceUnavailableError extends Error {
  constructor(
    message: string,
    readonly url?: string,
  ) {
    super(message);
    this.name = "SourceUnavailableError";
  }
}

export function assertAllowedUrl(rawUrl: string, extraHosts: string[] = []): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SourceUnavailableError(`Invalid URL: ${rawUrl}`);
  }

  if (url.protocol !== "https:") {
    throw new SourceUnavailableError(`Refusing non-HTTPS source URL: ${rawUrl}`, rawUrl);
  }
  if (!BASE_ALLOWED_HOSTS.has(url.hostname) && !extraHosts.includes(url.hostname)) {
    throw new SourceUnavailableError(`Host not allowed for source ingestion: ${url.hostname}`, rawUrl);
  }

  return url;
}

interface RequestOptions {
  extraHosts?: string[];
  headers?: Record<string, string>;
  maxBytes?: number;
  timeoutMs?: number;
  /** Sent only to api.github.com. */
  githubToken?: string;
}

function buildHeaders(url: URL, options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    ...options.headers,
  };

  const token = options.githubToken || process.env.GITHUB_TOKEN;
  if (token && url.hostname === "api.github.com") {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request(rawUrl: string, options: RequestOptions): Promise<Response> {
  const url = assertAllowedUrl(rawUrl, options.extraHosts);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: buildHeaders(url, options),
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new SourceUnavailableError(`HTTP ${response.status} for ${rawUrl}`, rawUrl);
    }

    return response;
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    throw new SourceUnavailableError(
      `Request failed for ${rawUrl}: ${error instanceof Error ? error.message : "unknown error"}`,
      rawUrl,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBytes(rawUrl: string, options: RequestOptions = {}): Promise<Uint8Array> {
  const response = await request(rawUrl, options);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    throw new SourceUnavailableError(`Refusing ${declared} bytes (cap ${maxBytes}) for ${rawUrl}`, rawUrl);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > maxBytes) {
    throw new SourceUnavailableError(`Refusing ${buffer.byteLength} bytes (cap ${maxBytes}) for ${rawUrl}`, rawUrl);
  }

  return buffer;
}

export interface TextResponse {
  text: string;
  etag?: string;
  lastModified?: string;
}

export async function fetchText(rawUrl: string, options: RequestOptions = {}): Promise<TextResponse> {
  const response = await request(rawUrl, options);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const buffer = new Uint8Array(await response.arrayBuffer());

  if (buffer.byteLength > maxBytes) {
    throw new SourceUnavailableError(`Refusing ${buffer.byteLength} bytes (cap ${maxBytes}) for ${rawUrl}`, rawUrl);
  }

  return {
    text: new TextDecoder("utf-8").decode(buffer),
    etag: response.headers.get("etag") || undefined,
    lastModified: response.headers.get("last-modified") || undefined,
  };
}

export async function fetchJson<T>(rawUrl: string, options: RequestOptions = {}): Promise<T> {
  const { text } = await fetchText(rawUrl, {
    ...options,
    headers: { accept: "application/vnd.github+json", ...options.headers },
  });

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SourceUnavailableError(`Invalid JSON from ${rawUrl}`, rawUrl);
  }
}
