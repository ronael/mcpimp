import { Hono } from "hono";
import { createMcpHandler } from "../mcp/handler";
import { createSseInitializeMessage } from "../mcp/protocol";
import type { CapabilityRegistry } from "../registry/types";
import { renderDashboard } from "./dashboard";

export function createServer(registry: CapabilityRegistry) {
  const app = new Hono();
  const handleMcpMessage = createMcpHandler(registry);

  app.get("/health", (c) => {
    return c.json({
      ok: true,
      capabilities: registry.listCapabilities().length,
    });
  });

  app.get("/sse", (c) => {
    return new Response(createSseInitializeMessage(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });

  app.post("/message", async (c) => {
    const message = await c.req.json().catch(() => null);
    if (!message || message.jsonrpc !== "2.0") {
      return c.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON-RPC message" } }, 400);
    }

    return c.json(await handleMcpMessage(message));
  });

  app.get("/dashboard", (c) => {
    return c.html(renderDashboard(registry));
  });

  return app;
}
