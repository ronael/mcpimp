import { Hono } from "hono";
import type { CapabilityRegistry } from "./types";
import { createMcpHandler } from "./mcp";

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
    const initial = JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {}, resources: {} },
      },
    });

    return new Response(`event: message\ndata: ${initial}\n\n`, {
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
    const capabilities = registry.listCapabilities();
    const rows = capabilities
      .map(
        (capability) =>
          `<li><strong>${capability.name}</strong><br><span>${capability.description}</span><br><code>${capability.files.length} files</code></li>`,
      )
      .join("");

    return c.html(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Capability Registry</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 40px; background: #101010; color: #f4f4f4; }
    a { color: inherit; }
    li { margin: 0 0 18px; }
    span { color: #b8b8b8; }
    code { color: #8fd3ff; }
  </style>
</head>
<body>
  <h1>Capability Registry</h1>
  <ul>${rows}</ul>
</body>
</html>`);
  });

  return app;
}
