import { Hono } from "hono";
import {
  activityClient,
  activityOutcome,
  activityParameters,
  activityTarget,
  activityUpstream,
  McpActivityLog,
  type McpActivityEvent,
  type McpActivityQuery,
  type McpActivityStatus,
  type McpTransport,
} from "../mcp/activity";
import { createMcpHandler, MODERN_PROTOCOL_VERSION, SERVER_INFO } from "../mcp/handler";
import { formatSseEvent, jsonRpcFailure, type JsonRpcRequest, type JsonRpcResponse } from "../mcp/protocol";
import { MCP_TOOLS } from "../mcp/tools";
import { UpstreamMcpGateway } from "../mcp/upstream";
import { catalogFingerprint } from "../registry/fingerprint";
import type { CapabilityRegistry } from "../registry/types";
import { renderDashboard } from "./dashboard";

interface SseSession {
  client: string;
  send(payload: unknown): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  return isRecord(value) && value.jsonrpc === "2.0" && typeof value.method === "string";
}

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  return isRecord(value)
    && value.jsonrpc === "2.0"
    && Object.prototype.hasOwnProperty.call(value, "id")
    && (Object.prototype.hasOwnProperty.call(value, "result")
      || Object.prototype.hasOwnProperty.call(value, "error"));
}

function validateModernRequest(
  message: JsonRpcRequest,
  protocolVersion: string | undefined,
  methodHeader: string | undefined,
  nameHeader: string | undefined,
): JsonRpcResponse | undefined {
  if (protocolVersion === undefined || protocolVersion.startsWith("2025-") || protocolVersion === "2024-11-05") {
    return undefined;
  }
  if (protocolVersion !== MODERN_PROTOCOL_VERSION) {
    return jsonRpcFailure(message.id ?? null, -32022, `Unsupported MCP protocol version: ${protocolVersion}`);
  }

  const metadata = isRecord(message.params?._meta) ? message.params._meta : undefined;
  const bodyVersion = metadata?.["io.modelcontextprotocol/protocolVersion"];
  const clientCapabilities = metadata?.["io.modelcontextprotocol/clientCapabilities"];
  if (bodyVersion !== MODERN_PROTOCOL_VERSION || !isRecord(clientCapabilities)) {
    return jsonRpcFailure(message.id ?? null, -32020, "MCP protocol metadata does not match the request headers");
  }
  if (methodHeader !== message.method) {
    return jsonRpcFailure(message.id ?? null, -32020, "Mcp-Method header does not match the JSON-RPC method");
  }
  if (message.method === "tools/call") {
    const toolName = message.params?.name;
    if (typeof toolName !== "string" || nameHeader !== toolName) {
      return jsonRpcFailure(message.id ?? null, -32020, "Mcp-Name header does not match the requested tool");
    }
  }
  return undefined;
}

export interface StaticSiteProvider {
  serve(path: string): Promise<Response | undefined>;
}

export interface ServerOptions {
  staticSite?: StaticSiteProvider;
  dashboardHome?: boolean;
  activityLog?: McpActivityLog;
  activityPersistence?: "process-memory" | "process-memory+ndjson";
  onActivity?: (event: McpActivityEvent) => void;
  now?: () => Date;
  runtime?: {
    kind: "node" | "worker" | "unknown";
    pid?: number;
    endpoint?: string;
  };
}

const ACTIVITY_STATUSES = new Set<McpActivityStatus>(["success", "error"]);
const ACTIVITY_TRANSPORTS = new Set<McpTransport>(["http", "sse", "upstream"]);

function parseActivityDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Invalid activity date: ${value}`);
  return new Date(value).toISOString();
}

function parseActivityLimit(value: string | undefined): number {
  if (value === undefined) return 100;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Invalid activity limit: ${value}`);
  return parsed;
}

function dashboardLinks(language: "en" | "fr", staticSite?: StaticSiteProvider) {
  if (!staticSite) return {};

  return {
    agentGuidePath: language === "fr" ? "/fr/docs/agents.html" : "/docs/agents.html",
    sourceGuidePath: language === "fr" ? "/fr/docs/sources.html" : "/docs/sources.html",
    sitePath: language === "fr" ? "/fr/" : "/",
  };
}

export function createServer(registry: CapabilityRegistry, options: ServerOptions = {}) {
  const app = new Hono();
  const activityLog = options.activityLog || new McpActivityLog(200, options.onActivity);
  const upstreamGateway = new UpstreamMcpGateway(registry, (event) => {
    activityLog.record({
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      transport: "upstream",
      client: event.client || "MCPIMP",
      method: event.method,
      target: event.target,
      status: event.status,
      durationMs: event.durationMs,
      ...(event.requestId !== undefined ? { requestId: event.requestId } : {}),
      ...(event.sessionId ? { sessionId: event.sessionId } : {}),
      upstream: { capabilityId: event.capabilityId, tool: event.tool || "tools/list" },
      ...(event.status === "success"
        ? { result: { kind: "upstream-response" } }
        : { error: { code: -32000, message: "Upstream MCP request failed" } }),
    });
  });
  const handleMcpMessage = createMcpHandler(registry, upstreamGateway);
  const sessions = new Map<string, SseSession>();
  const encoder = new TextEncoder();
  const now = options.now || (() => new Date());
  let startedAt = options.runtime?.kind === "worker" ? undefined : now();
  const catalogRevision = catalogFingerprint(registry);

  function runtimeStartedAt(): Date {
    startedAt ||= now();
    return startedAt;
  }

  app.use("*", async (_context, next) => {
    runtimeStartedAt();
    await next();
  });

  async function serveStatic(path: string) {
    return options.staticSite?.serve(path);
  }

  async function handleAndRecord(
    message: JsonRpcRequest,
    transport: McpTransport,
    client: string,
    sessionId?: string,
  ): Promise<JsonRpcResponse> {
    const startedAt = performance.now();
    const correlationId = crypto.randomUUID();
    const resolvedClient = activityClient(message, client);
    const response = await handleMcpMessage(message, {
      correlationId,
      client: resolvedClient,
      ...(message.id !== undefined ? { requestId: message.id } : {}),
      ...(sessionId ? { sessionId } : {}),
    });
    const upstream = activityUpstream(message);
    const rawOutcome = activityOutcome(message, response);
    const outcome = upstream && rawOutcome.error
      ? { ...rawOutcome, error: { code: rawOutcome.error.code, message: "Upstream MCP request failed" } }
      : rawOutcome;
    const parameters = activityParameters(message);
    activityLog.record({
      correlationId,
      transport,
      client: resolvedClient,
      method: message.method,
      target: activityTarget(message),
      status: outcome.status,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      ...(message.id !== undefined ? { requestId: message.id } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(upstream ? { upstream } : {}),
      ...(parameters ? { parameters } : {}),
      ...(outcome.result ? { result: outcome.result } : {}),
      ...(outcome.error ? { error: outcome.error } : {}),
    });
    return response;
  }

  app.get("/", async (c) => (options.dashboardHome ? c.redirect("/dashboard") : (await serveStatic(c.req.path)) || c.notFound()));
  app.get("/index.html", async (c) => (options.dashboardHome ? c.redirect("/dashboard") : (await serveStatic(c.req.path)) || c.notFound()));
  app.get("/fr/", async (c) => (options.dashboardHome ? c.redirect("/fr/dashboard") : (await serveStatic(c.req.path)) || c.notFound()));
  app.get("/fr/index.html", async (c) => (options.dashboardHome ? c.redirect("/fr/dashboard") : (await serveStatic(c.req.path)) || c.notFound()));
  app.get("/docs/sources.html", async (c) => (await serveStatic(c.req.path)) || c.notFound());
  app.get("/fr/docs/sources.html", async (c) => (await serveStatic(c.req.path)) || c.notFound());
  app.get("/docs/agents.html", async (c) => (await serveStatic(c.req.path)) || c.notFound());
  app.get("/fr/docs/agents.html", async (c) => (await serveStatic(c.req.path)) || c.notFound());
  app.get("/assets/*", async (c) => (await serveStatic(c.req.path)) || c.notFound());

  app.get("/health", async (c) => {
    const runtime = options.runtime || { kind: "unknown" as const };
    const healthySince = runtimeStartedAt();
    return c.json({
      ok: true,
      capabilities: registry.listCapabilities().length,
      version: SERVER_INFO.version,
      runtime: runtime.kind,
      ...(runtime.pid ? { pid: runtime.pid } : {}),
      endpoint: runtime.endpoint || "/message",
      localTools: MCP_TOOLS.length,
      catalogRevision: await catalogRevision,
      startedAt: healthySince.toISOString(),
      uptimeSeconds: Math.max(0, Math.floor((now().getTime() - healthySince.getTime()) / 1_000)),
    });
  });

  app.get("/activity", (c) => {
    const status = c.req.query("status");
    const transport = c.req.query("transport");
    const format = c.req.query("format") || "json";
    if (status && !ACTIVITY_STATUSES.has(status as McpActivityStatus)) {
      return c.json({ error: `Invalid activity status: ${status}` }, 400);
    }
    if (transport && !ACTIVITY_TRANSPORTS.has(transport as McpTransport)) {
      return c.json({ error: `Invalid activity transport: ${transport}` }, 400);
    }
    if (format !== "json" && format !== "ndjson") {
      return c.json({ error: `Invalid activity format: ${format}` }, 400);
    }

    let query: McpActivityQuery;
    try {
      query = {
        limit: parseActivityLimit(c.req.query("limit")),
        client: c.req.query("client"),
        method: c.req.query("method"),
        tool: c.req.query("tool"),
        status: status as McpActivityStatus | undefined,
        transport: transport as McpTransport | undefined,
        from: parseActivityDate(c.req.query("from")),
        to: parseActivityDate(c.req.query("to")),
      };
      if (query.from && query.to && Date.parse(query.from) > Date.parse(query.to)) {
        throw new Error("Activity from date must not be after to date");
      }
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Invalid activity query" }, 400);
    }

    const events = activityLog.query(query);
    const persistence = options.activityPersistence || "process-memory";
    c.header("Cache-Control", "no-store");
    c.header("X-MCPIMP-Activity-Persistence", persistence);
    if (c.req.query("download") === "1") {
      c.header("Content-Disposition", `attachment; filename="mcpimp-activity.${format}"`);
    }
    if (format === "ndjson") {
      c.header("Content-Type", "application/x-ndjson; charset=utf-8");
      return c.body(events.length > 0 ? `${events.map((event) => JSON.stringify(event)).join("\n")}\n` : "");
    }
    return c.json({ events, facets: activityLog.facets(), persistence });
  });

  app.get("/sse", (c) => {
    const sessionId = crypto.randomUUID();
    const client = c.req.header("user-agent") || "unknown client";
    let keepAlive: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));
        sessions.set(sessionId, {
          client,
          send(payload) {
            write(formatSseEvent("message", payload));
          },
        });

        write(formatSseEvent("endpoint", `/message?sessionId=${encodeURIComponent(sessionId)}`));
        keepAlive = setInterval(() => write(": keepalive\n\n"), 15_000);
      },
      cancel() {
        if (keepAlive) clearInterval(keepAlive);
        sessions.delete(sessionId);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  });

  app.post("/message", async (c) => {
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json(jsonRpcFailure(null, -32700, "Invalid JSON"), 400);
    }

    const batch = Array.isArray(payload) ? payload : undefined;
    const isBatch = batch !== undefined;
    if (batch?.length === 0) {
      return c.json(jsonRpcFailure(null, -32600, "Invalid JSON-RPC batch"), 400);
    }
    const messages: unknown[] = batch || [payload];

    const protocolVersion = c.req.header("mcp-protocol-version");
    if (protocolVersion === MODERN_PROTOCOL_VERSION && isBatch) {
      return c.json(jsonRpcFailure(null, -32600, "MCP 2026 does not support JSON-RPC batches"), 400);
    }

    const sessionId = c.req.query("sessionId");
    if (!sessionId) {
      const responses: JsonRpcResponse[] = [];
      for (const message of messages) {
        // MCPIMP does not initiate client requests yet, but Streamable HTTP
        // permits clients to POST responses. Accept them without inventing an
        // activity event or a response to the response.
        if (isJsonRpcResponse(message)) continue;
        if (!isJsonRpcRequest(message)) {
          responses.push(jsonRpcFailure(null, -32600, "Invalid JSON-RPC message"));
          continue;
        }

        const protocolError = validateModernRequest(
          message,
          protocolVersion,
          c.req.header("mcp-method"),
          c.req.header("mcp-name"),
        );
        if (protocolError) return c.json(protocolError, 400);

        const response = await handleAndRecord(message, "http", c.req.header("user-agent") || "unknown client");
        if (message.id !== undefined) responses.push(response);
      }

      if (responses.length === 0) return c.body(null, 202);
      if (!isBatch && !isJsonRpcRequest(payload)) return c.json(responses[0], 400);
      if (protocolVersion === MODERN_PROTOCOL_VERSION) c.header("MCP-Protocol-Version", MODERN_PROTOCOL_VERSION);
      return c.json(isBatch ? responses : responses[0]);
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return c.json(jsonRpcFailure(null, -32000, `Unknown SSE session: ${sessionId}`), 404);
    }

    for (const message of messages) {
      if (isJsonRpcResponse(message)) continue;
      if (!isJsonRpcRequest(message)) {
        session.send(jsonRpcFailure(null, -32600, "Invalid JSON-RPC message"));
        continue;
      }

      if (message.id !== undefined) {
        session.send(await handleAndRecord(message, "sse", session.client, sessionId));
      } else {
        await handleAndRecord(message, "sse", session.client, sessionId);
      }
    }

    return c.body(null, 202);
  });

  app.get("/dashboard", (c) => {
    return c.html(renderDashboard(registry, "en", dashboardLinks("en", options.staticSite)));
  });

  app.get("/fr/dashboard", (c) => {
    return c.html(renderDashboard(registry, "fr", dashboardLinks("fr", options.staticSite)));
  });

  return app;
}
