import type { CapabilityRegistry, CapabilityUpstreamMcp } from "../registry/types";

interface UpstreamTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface ResolvedUpstream {
  upstream: CapabilityUpstreamMcp;
  url?: string;
  headers?: Record<string, string>;
  missingEnv: string[];
}

type UpstreamErrorCode = "timeout" | "http" | "protocol" | "network";

interface SafeUpstreamError {
  code: UpstreamErrorCode;
  message: string;
}

interface ToolCache {
  configurationKey: string;
  expiresAt: number;
  tools: UpstreamTool[];
}

interface UpstreamRuntimeState {
  reachable?: boolean;
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  latencyMs?: number;
  lastError?: SafeUpstreamError;
  cache?: ToolCache;
  refresh?: Promise<UpstreamTool[]>;
  lastInvalidatedAt?: string;
  lastInvalidationReason?: string;
}

export interface UpstreamGatewayOptions {
  fetch?: typeof globalThis.fetch;
  now?: () => number;
  requestTimeoutMs?: number;
  toolListTtlMs?: number;
}

export interface UpstreamRequestContext {
  correlationId?: string;
  client?: string;
  requestId?: string | number | null;
  sessionId?: string;
}

export interface UpstreamActivityEvent extends UpstreamRequestContext {
  capabilityId: string;
  method: "tools/list" | "tools/call";
  target: string;
  tool?: string;
  status: "success" | "error";
  durationMs: number;
}

class UpstreamRequestError extends Error {
  constructor(readonly code: UpstreamErrorCode, message: string) {
    super(message);
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const DEFAULT_TOOL_LIST_TTL_MS = 60_000;

function positiveDuration(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
  return value;
}

function getEnv(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[name];
}

function resolveTemplate(value: string): { value?: string; missingEnv: string[] } {
  const missingEnv: string[] = [];
  const resolved = value.replaceAll(/env:([A-Z0-9_]+)/gi, (_, name: string) => {
    const envValue = getEnv(name);
    if (!envValue) {
      missingEnv.push(name);
      return "";
    }
    return envValue;
  });

  return { value: missingEnv.length > 0 ? undefined : resolved, missingEnv };
}

function resolveUpstream(upstream: CapabilityUpstreamMcp): ResolvedUpstream {
  const url = resolveTemplate(upstream.config.url);
  const headers: Record<string, string> = {};
  const missingEnv = [...url.missingEnv];

  for (const [key, value] of Object.entries(upstream.config.headers || {})) {
    const resolved = resolveTemplate(value);
    missingEnv.push(...resolved.missingEnv);
    if (resolved.value) headers[key] = resolved.value;
  }

  return {
    upstream,
    url: url.value,
    headers,
    missingEnv: [...new Set(missingEnv)],
  };
}

function configurationKey(upstream: CapabilityUpstreamMcp): string {
  return JSON.stringify({
    enabled: upstream.config.enabled !== false,
    headers: upstream.config.headers || {},
    transport: upstream.config.transport,
    type: upstream.config.type,
    url: upstream.config.url,
  });
}

function safeError(error: unknown): SafeUpstreamError {
  if (error instanceof UpstreamRequestError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return { code: "timeout", message: "Upstream MCP request timed out" };
  }
  return { code: "network", message: "Upstream MCP request failed" };
}

async function postJsonRpc(
  fetcher: typeof globalThis.fetch,
  url: string,
  headers: Record<string, string>,
  method: string,
  timeoutMs: number,
  params?: unknown,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method,
        params,
      }),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new UpstreamRequestError("timeout", "Upstream MCP request timed out");
    }
    throw new UpstreamRequestError("network", "Upstream MCP request failed");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new UpstreamRequestError("http", `Upstream MCP returned HTTP ${response.status}`);
  }

  try {
    const text = await response.text();
    const payload = parseJsonRpcResponse(text, response.headers.get("content-type") || "");
    if (payload.error) {
      throw new UpstreamRequestError("protocol", "Upstream MCP returned a protocol error");
    }
    return payload.result;
  } catch (error) {
    if (error instanceof UpstreamRequestError) throw error;
    throw new UpstreamRequestError("protocol", "Upstream MCP returned an invalid response");
  }
}

function parseJsonRpcResponse(text: string, contentType: string) {
  if (contentType.includes("text/event-stream") || text.startsWith("event:")) {
    const data = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .join("\n");

    if (!data) throw new Error("Upstream MCP returned an empty event stream");
    return JSON.parse(data);
  }

  return JSON.parse(text);
}

export class UpstreamMcpGateway {
  readonly #fetch: typeof globalThis.fetch;
  readonly #now: () => number;
  readonly #requestTimeoutMs: number;
  readonly #toolListTtlMs: number;
  readonly #runtime = new Map<string, UpstreamRuntimeState>();

  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly onActivity?: (event: UpstreamActivityEvent) => void,
    options: UpstreamGatewayOptions = {},
  ) {
    this.#fetch = options.fetch || globalThis.fetch;
    this.#now = options.now || Date.now;
    this.#requestTimeoutMs = positiveDuration(
      options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      "requestTimeoutMs",
    );
    this.#toolListTtlMs = positiveDuration(
      options.toolListTtlMs ?? DEFAULT_TOOL_LIST_TTL_MS,
      "toolListTtlMs",
    );
  }

  policy() {
    return {
      requestTimeoutMs: this.#requestTimeoutMs,
      toolListTtlMs: this.#toolListTtlMs,
      staleOnError: true,
    } as const;
  }

  #state(capabilityId: string): UpstreamRuntimeState {
    const existing = this.#runtime.get(capabilityId);
    if (existing) return existing;
    const created: UpstreamRuntimeState = {};
    this.#runtime.set(capabilityId, created);
    return created;
  }

  async #request(
    resolved: ResolvedUpstream,
    url: string,
    method: "tools/list" | "tools/call",
    params: unknown,
    context: UpstreamRequestContext,
    tool?: string,
  ) {
    const startedAt = performance.now();
    const target = tool ? `${resolved.upstream.capabilityId}.${tool}` : resolved.upstream.capabilityId;
    const state = this.#state(resolved.upstream.capabilityId);
    try {
      const result = await postJsonRpc(
        this.#fetch,
        url,
        resolved.headers || {},
        method,
        this.#requestTimeoutMs,
        params,
      );
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      state.reachable = true;
      state.lastCheckedAt = new Date(this.#now()).toISOString();
      state.lastSuccessAt = state.lastCheckedAt;
      state.latencyMs = durationMs;
      delete state.lastError;
      this.onActivity?.({
        ...context,
        capabilityId: resolved.upstream.capabilityId,
        method,
        target,
        ...(tool ? { tool } : {}),
        status: "success",
        durationMs,
      });
      return result;
    } catch (error) {
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      state.reachable = false;
      state.lastCheckedAt = new Date(this.#now()).toISOString();
      state.latencyMs = durationMs;
      state.lastError = safeError(error);
      this.onActivity?.({
        ...context,
        capabilityId: resolved.upstream.capabilityId,
        method,
        target,
        ...(tool ? { tool } : {}),
        status: "error",
        durationMs,
      });
      throw error;
    }
  }

  listUpstreams() {
    return this.registry.listUpstreamMcpServers().map((upstream) => {
      const resolved = resolveUpstream(upstream);
      const runtime = this.#runtime.get(upstream.capabilityId);
      const cacheStatus = !runtime?.cache
        ? "empty"
        : runtime.cache.expiresAt > this.#now() && runtime.reachable !== false
          ? "fresh"
          : "stale";

      return {
        capabilityId: upstream.capabilityId,
        capabilityName: upstream.capabilityName,
        type: upstream.config.type,
        transport: upstream.config.transport,
        enabled: upstream.config.enabled !== false,
        url: upstream.config.url,
        status:
          upstream.config.enabled === false
            ? "disabled"
            : resolved.missingEnv.length > 0
              ? "missing-env"
              : "ready",
        missingEnv: resolved.missingEnv,
        reachable: runtime?.reachable ?? null,
        lastCheckedAt: runtime?.lastCheckedAt,
        lastSuccessAt: runtime?.lastSuccessAt,
        latencyMs: runtime?.latencyMs,
        lastError: runtime?.lastError,
        cacheStatus,
        cachedToolCount: runtime?.cache?.tools.length || 0,
        cacheExpiresAt: runtime?.cache ? new Date(runtime.cache.expiresAt).toISOString() : undefined,
        lastInvalidatedAt: runtime?.lastInvalidatedAt,
        lastInvalidationReason: runtime?.lastInvalidationReason,
      };
    });
  }

  invalidateToolCache(capabilityId?: string, reason = "manual") {
    const invalidatedAt = new Date(this.#now()).toISOString();
    for (const [id, state] of this.#runtime) {
      if (capabilityId && id !== capabilityId) continue;
      if (state.cache) state.cache.expiresAt = 0;
      state.lastInvalidatedAt = invalidatedAt;
      state.lastInvalidationReason = reason;
    }
  }

  async #listToolsForUpstream(
    resolved: ResolvedUpstream,
    context: UpstreamRequestContext,
  ): Promise<UpstreamTool[]> {
    const capabilityId = resolved.upstream.capabilityId;
    const state = this.#state(capabilityId);
    const key = configurationKey(resolved.upstream);
    if (state.cache && state.cache.configurationKey !== key) {
      delete state.cache;
      state.lastInvalidatedAt = new Date(this.#now()).toISOString();
      state.lastInvalidationReason = "configuration-changed";
    }
    if (state.cache && state.cache.expiresAt > this.#now()) return state.cache.tools;
    if (state.refresh) return state.refresh;

    state.refresh = (async () => {
      try {
        const result = await this.#request(
          resolved,
          resolved.url as string,
          "tools/list",
          undefined,
          context,
        );
        const tools = ((result?.tools || []) as UpstreamTool[]).map((tool) => ({
          ...tool,
          name: `${capabilityId}.${tool.name}`,
          description: `[${resolved.upstream.capabilityName}] ${tool.description || "Upstream MCP tool"}`,
        }));
        state.cache = {
          configurationKey: key,
          expiresAt: this.#now() + this.#toolListTtlMs,
          tools,
        };
        return tools;
      } catch {
        return state.cache?.tools || [];
      } finally {
        delete state.refresh;
      }
    })();
    return state.refresh;
  }

  async listTools(context: UpstreamRequestContext = {}) {
    const available = this.registry.listUpstreamMcpServers()
      .filter((upstream) => upstream.config.enabled !== false)
      .map(resolveUpstream)
      .filter((resolved): resolved is ResolvedUpstream & { url: string } => (
        Boolean(resolved.url) && resolved.missingEnv.length === 0
      ));
    const toolGroups = await Promise.all(available.map((resolved) => this.#listToolsForUpstream(resolved, context)));
    return toolGroups.flat();
  }

  canHandleTool(name: string): boolean {
    const separator = name.indexOf(".");
    const capabilityId = separator === -1 ? "" : name.slice(0, separator);
    const toolName = separator === -1 ? "" : name.slice(separator + 1);
    return Boolean(capabilityId && toolName && this.registry.getCapability(capabilityId)?.mcp);
  }

  async callTool(name: string, args: Record<string, unknown>, context: UpstreamRequestContext = {}) {
    const separator = name.indexOf(".");
    const capabilityId = separator === -1 ? "" : name.slice(0, separator);
    const toolName = separator === -1 ? "" : name.slice(separator + 1);
    if (!capabilityId || !toolName) throw new Error(`Invalid upstream tool name: ${name}`);

    const upstream = this.registry
      .listUpstreamMcpServers()
      .find((candidate) => candidate.capabilityId === capabilityId);

    if (!upstream) throw new Error(`Upstream MCP not found for capability: ${capabilityId}`);
    if (upstream.config.enabled === false) throw new Error(`Upstream MCP is disabled: ${capabilityId}`);

    const resolved = resolveUpstream(upstream);
    if (!resolved.url || resolved.missingEnv.length > 0) {
      throw new Error(`Missing env for upstream ${capabilityId}: ${resolved.missingEnv.join(", ")}`);
    }

    return this.#request(
      resolved,
      resolved.url,
      "tools/call",
      { name: toolName, arguments: args },
      context,
      toolName,
    );
  }
}
