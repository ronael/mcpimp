import { Hono } from "hono";
import { createMcpHandler } from "../mcp/handler";
import { formatSseEvent, jsonRpcFailure, type JsonRpcRequest } from "../mcp/protocol";
import type { CapabilityRegistry } from "../registry/types";
import { renderDashboard } from "./dashboard";

interface SseSession {
  send(payload: unknown): void;
}

export interface StaticSiteProvider {
  serve(path: string): Promise<Response | undefined>;
}

export interface ServerOptions {
  staticSite?: StaticSiteProvider;
  dashboardHome?: boolean;
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
  const sessions = new Map<string, SseSession>();
  const encoder = new TextEncoder();

  async function serveStatic(path: string) {
    return options.staticSite?.serve(path);
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

  app.get("/sse", () => {
    const sessionId = crypto.randomUUID();
    let keepAlive: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));
        sessions.set(sessionId, {
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
    const message = await c.req.json().catch(() => null) as JsonRpcRequest | null;
    if (!message || message.jsonrpc !== "2.0") {
      return c.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON-RPC message" } }, 400);
    }

    const sessionId = c.req.query("sessionId");
    if (!sessionId) {
      return c.json(await handleMcpMessage(message));
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return c.json(jsonRpcFailure(message.id ?? null, -32000, `Unknown SSE session: ${sessionId}`), 404);
    }

    if (message.id !== undefined) {
      session.send(await handleMcpMessage(message));
    } else if (message.method !== "notifications/initialized") {
      await handleMcpMessage(message);
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
