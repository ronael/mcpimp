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

async function postJsonRpc(url: string, headers: Record<string, string>, method: string, params?: unknown) {
  const response = await fetch(url, {
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
  });

  if (!response.ok) {
    throw new Error(`Upstream MCP returned HTTP ${response.status}`);
  }

  const text = await response.text();
  const payload = parseJsonRpcResponse(text, response.headers.get("content-type") || "");
  if (payload.error) {
    throw new Error(payload.error.message || "Upstream MCP error");
  }

  return payload.result;
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
  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly onActivity?: (event: UpstreamActivityEvent) => void,
  ) {}

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
    try {
      const result = await postJsonRpc(url, resolved.headers || {}, method, params);
      this.onActivity?.({
        ...context,
        capabilityId: resolved.upstream.capabilityId,
        method,
        target,
        ...(tool ? { tool } : {}),
        status: "success",
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      });
      return result;
    } catch (error) {
      this.onActivity?.({
        ...context,
        capabilityId: resolved.upstream.capabilityId,
        method,
        target,
        ...(tool ? { tool } : {}),
        status: "error",
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      });
      throw error;
    }
  }

  listUpstreams() {
    return this.registry.listUpstreamMcpServers().map((upstream) => {
      const resolved = resolveUpstream(upstream);

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
      };
    });
  }

  async listTools(context: UpstreamRequestContext = {}) {
    const tools = [];

    for (const upstream of this.registry.listUpstreamMcpServers()) {
      if (upstream.config.enabled === false) continue;

      const resolved = resolveUpstream(upstream);
      if (!resolved.url || resolved.missingEnv.length > 0) continue;

      const result = await this.#request(
        resolved,
        resolved.url,
        "tools/list",
        undefined,
        context,
      );
      for (const tool of (result.tools || []) as UpstreamTool[]) {
        tools.push({
          ...tool,
          name: `${upstream.capabilityId}.${tool.name}`,
          description: `[${upstream.capabilityName}] ${tool.description || "Upstream MCP tool"}`,
        });
      }
    }

    return tools;
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
