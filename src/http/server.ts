import { Hono } from "hono";
import {
  activityClient,
  activityOutcome,
  activityParameters,
  activityTarget,
  McpActivityLog,
  type McpActivityEvent,
  type McpTransport,
} from "../mcp/activity";
import { createMcpHandler } from "../mcp/handler";
import { formatSseEvent, jsonRpcFailure, type JsonRpcRequest, type JsonRpcResponse } from "../mcp/protocol";
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

export interface StaticSiteProvider {
  serve(path: string): Promise<Response | undefined>;
}

export interface ServerOptions {
  staticSite?: StaticSiteProvider;
  dashboardHome?: boolean;
  activityLog?: McpActivityLog;
  onActivity?: (event: McpActivityEvent) => void;
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
  const handleMcpMessage = createMcpHandler(registry);
  const activityLog = options.activityLog || new McpActivityLog(200, options.onActivity);
  const sessions = new Map<string, SseSession>();
  const encoder = new TextEncoder();

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
    const response = await handleMcpMessage(message);
    const outcome = activityOutcome(message, response);
    const parameters = activityParameters(message);
    activityLog.record({
      transport,
      client: activityClient(message, client),
      method: message.method,
      target: activityTarget(message),
      status: outcome.status,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      ...(message.id !== undefined ? { requestId: message.id } : {}),
      ...(sessionId ? { sessionId } : {}),
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

  app.get("/health", (c) => {
    return c.json({
      ok: true,
      capabilities: registry.listCapabilities().length,
    });
  });

  app.get("/activity", (c) => {
    const requestedLimit = Number(c.req.query("limit") || 100);
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 100;
    c.header("Cache-Control", "no-store");
    return c.json({ events: activityLog.list(limit) });
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

        const response = await handleAndRecord(message, "http", c.req.header("user-agent") || "unknown client");
        if (message.id !== undefined) responses.push(response);
      }

      if (responses.length === 0) return c.body(null, 202);
      if (!isBatch && !isJsonRpcRequest(payload)) return c.json(responses[0], 400);
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
