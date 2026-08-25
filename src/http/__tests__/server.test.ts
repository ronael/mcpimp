import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { createServer } from "../server";
import { FileSystemCapabilityRegistry } from "../../registry/filesystem";

const fixturesRoot = resolve("test/fixtures/capabilities");

async function createApp() {
  const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
  return createServer(registry);
}

describe("Hono server", () => {
  it("serves health status", async () => {
    const app = await createApp();
    const response = await app.request("/health");

    await expect(response.json()).resolves.toMatchObject({ ok: true, capabilities: 1 });
  });

  it("handles JSON-RPC messages", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        tools: expect.any(Array),
      },
    });
  });

  it("acknowledges JSON-RPC notifications without a response body", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("");
  });

  it("records MCP activity without request arguments or response contents", async () => {
    const app = await createApp();
    await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Codex Test/1.0" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "search-capabilities", arguments: { query: "landing", token: "must-not-leak" } },
      }),
    });

    const response = await app.request("/activity");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload: any = await response.json();
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0]).toMatchObject({
      client: "Codex Test/1.0",
      method: "tools/call",
      target: "search-capabilities",
      status: "success",
      transport: "http",
      requestId: 2,
      parameters: { query: "landing" },
      result: { kind: "tool-result", blockCount: 1, contentTypes: ["text"] },
    });
    expect(JSON.stringify(payload)).not.toContain("must-not-leak");
  });

  it("supports legacy MCP SSE transport", async () => {
    const app = await createApp();
    const sse = await app.request("/sse");
    const reader = sse.body?.getReader();
    expect(reader).toBeDefined();

    const first = await reader!.read();
    const endpointEvent = new TextDecoder().decode(first.value);
    expect(endpointEvent).toContain("event: endpoint");

    const endpoint = endpointEvent.match(/^data: (.+)$/m)?.[1];
    expect(endpoint).toMatch(/^\/message\?sessionId=/);

    const post = await app.request(endpoint!, {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    });

    expect(post.status).toBe(202);

    const second = await reader!.read();
    const messageEvent = new TextDecoder().decode(second.value);
    expect(messageEvent).toContain("event: message");
    expect(messageEvent).toContain('"id":1');
    expect(messageEvent).toContain('"serverInfo"');

    await reader!.cancel();
  });

  it("returns JSON-RPC errors for unknown methods", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "unknown/method" }),
    });

    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 9,
      error: {
        code: -32601,
      },
    });
  });

  it("renders a dashboard that explains discovery, endpoints, tools, and resources", async () => {
    const app = await createApp();
    const response = await app.request("/dashboard");
    const html = await response.text();

    expect(html).toContain("The server scans");
    expect(html).toContain("/health");
    expect(html).toContain("/message");
    expect(html).toContain("/activity");
    expect(html).toContain('href="#activity"');
    expect(html).toContain('id="activityRows"');
    expect(html).toContain('href="#connect"');
    expect(html).toContain("codex mcp add mcpimp --url http://localhost:3901/message");
    expect(html).toContain("claude mcp add --transport http --scope user mcpimp http://localhost:3901/message");
    expect(html).toContain('href="#discovery"');
    expect(html).toContain('id="endpoints"');
    expect(html).toContain('href="#capability-landing-page"');
    expect(html).toContain('id="capability-landing-page"');
    expect(html).toContain("list-capabilities");
    expect(html).toContain("search-capabilities");
    expect(html).toContain("skill://landing-page/SKILL.md");
    expect(html).toContain("Sources and references");
    expect(html).toContain("https://example.com/source");
  });

  it("renders the French dashboard at /fr/dashboard", async () => {
    const app = await createApp();
    const response = await app.request("/fr/dashboard");
    const html = await response.text();

    expect(html).toContain('<html lang="fr">');
    expect(html).toContain("Le serveur scanne");
    expect(html).toContain("Sources &amp; références");
  });

  it("serves static docs through the same server when configured", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
    const app = createServer(registry, {
      staticSite: {
        async serve(path) {
          if (path === "/docs/sources.html") {
            return new Response("<h1>Sources</h1>", {
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          }
          if (path === "/docs/agents.html") {
            return new Response("<h1>Connect an agent</h1>", {
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          }
          if (path === "/assets/css/pages/sources.css") {
            return new Response("body{}", {
              headers: { "content-type": "text/css; charset=utf-8" },
            });
          }
          return undefined;
        },
      },
    });

    const dashboard = await app.request("/dashboard");
    const dashboardHtml = await dashboard.text();
    expect(dashboardHtml).toContain('href="/docs/sources.html"');
    expect(dashboardHtml).toContain('href="/docs/agents.html"');

    const agents = await app.request("/docs/agents.html");
    expect(agents.status).toBe(200);
    await expect(agents.text()).resolves.toContain("Connect an agent");

    const docs = await app.request("/docs/sources.html");
    expect(docs.status).toBe(200);
    expect(docs.headers.get("content-type")).toContain("text/html");
    await expect(docs.text()).resolves.toContain("Sources");

    const css = await app.request("/assets/css/pages/sources.css");
    expect(css.status).toBe(200);
    expect(css.headers.get("content-type")).toContain("text/css");
  });

  it("can redirect local home routes to the dashboard", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
    const app = createServer(registry, {
      dashboardHome: true,
      staticSite: {
        async serve() {
          return new Response("<h1>Home</h1>");
        },
      },
    });

    const home = await app.request("/");
    expect(home.status).toBe(302);
    expect(home.headers.get("location")).toBe("/dashboard");

    const frenchHome = await app.request("/fr/");
    expect(frenchHome.status).toBe(302);
    expect(frenchHome.headers.get("location")).toBe("/fr/dashboard");
  });
});
