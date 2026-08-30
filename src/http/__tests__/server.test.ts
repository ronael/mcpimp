import { afterEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { createServer } from "../server";
import { FileSystemCapabilityRegistry } from "../../registry/filesystem";
import { McpActivityLog } from "../../mcp/activity";

const fixturesRoot = resolve("test/fixtures/capabilities");
const upstreamFixturesRoot = resolve("test/fixtures/upstream-capabilities");

async function createApp() {
  const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
  return createServer(registry);
}

describe("Hono server", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TEST_NOCO_MCP_URL;
    delete process.env.TEST_NOCO_MCP_TOKEN;
  });

  it("serves health status", async () => {
    const app = await createApp();
    const response = await app.request("/health");

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      capabilities: 1,
      version: "1.0.0",
      runtime: "unknown",
      endpoint: "/message",
      localTools: expect.any(Number),
      catalogRevision: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      startedAt: expect.any(String),
      uptimeSeconds: expect.any(Number),
    });
  });

  it("includes local process metadata when supplied", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
    const app = createServer(registry, {
      runtime: { kind: "node", pid: 4242, endpoint: "http://localhost:3901/message" },
    });

    await expect((await app.request("/health")).json()).resolves.toMatchObject({
      runtime: "node",
      pid: 4242,
      endpoint: "http://localhost:3901/message",
    });
  });

  it("initializes Worker uptime from the first request instead of module evaluation", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
    const now = vi.fn(() => new Date("2026-08-31T01:00:00.000Z"));
    const app = createServer(registry, {
      runtime: { kind: "worker", endpoint: "/message" },
      now,
    });

    expect(now).not.toHaveBeenCalled();
    const health: any = await (await app.request("/health")).json();

    expect(health.startedAt).toBe("2026-08-31T01:00:00.000Z");
    expect(health.uptimeSeconds).toBe(0);
    expect(now).toHaveBeenCalled();
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

  it("exposes the shared upstream runtime state after tool discovery", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: { tools: [{ name: "inspect", description: "Inspect upstream" }] },
      });
    });
    const app = createServer(registry, { upstream: { fetch: fetcher, toolListTtlMs: 60_000 } });

    const before: any = await (await app.request("/upstreams")).json();
    expect(before.upstreams).toEqual(expect.arrayContaining([
      expect.objectContaining({ capabilityId: "crm-connector", reachable: null, cacheStatus: "empty" }),
    ]));

    await app.request("/message", {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

    const response = await app.request("/upstreams");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      policy: { requestTimeoutMs: 5_000, toolListTtlMs: 60_000, staleOnError: true },
      upstreams: expect.arrayContaining([
        expect.objectContaining({
          capabilityId: "crm-connector",
          reachable: true,
          cacheStatus: "fresh",
          cachedToolCount: 1,
          latencyMs: expect.any(Number),
          lastCheckedAt: expect.any(String),
        }),
      ]),
    });
  });

  it("supports MCP 2026 discovery and tool calls without initialize", async () => {
    const app = await createApp();
    const metadata = {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
    };
    const request = (method: string, params: Record<string, unknown> = {}, name?: string) => app.request("/message", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-protocol-version": "2026-07-28",
        "mcp-method": method,
        ...(name ? { "mcp-name": name } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: metadata } }),
    });

    const discover = await request("server/discover");
    expect(discover.status).toBe(200);
    expect(discover.headers.get("mcp-protocol-version")).toBe("2026-07-28");
    await expect(discover.json()).resolves.toMatchObject({
      result: { resultType: "complete", supportedVersions: expect.arrayContaining(["2026-07-28"]) },
    });

    await expect((await request("tools/list")).json()).resolves.toMatchObject({
      result: { resultType: "complete", tools: expect.any(Array), ttlMs: expect.any(Number) },
    });
    await expect((await request(
      "tools/call",
      { name: "list-capabilities", arguments: {} },
      "list-capabilities",
    )).json()).resolves.toMatchObject({
      result: { resultType: "complete", content: expect.any(Array) },
    });
  });

  it("rejects inconsistent MCP 2026 routing headers", async () => {
    const app = await createApp();
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/list",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    });
    const mismatch = await app.request("/message", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-protocol-version": "2026-07-28",
        "mcp-method": "resources/list",
      },
      body,
    });

    expect(mismatch.status).toBe(400);
    await expect(mismatch.json()).resolves.toMatchObject({ error: { code: -32020 } });
  });

  it("rejects unsupported MCP protocol versions", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-protocol-version": "2027-01-01",
        "mcp-method": "tools/list",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 5, method: "tools/list" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: -32022 } });
  });

  it("handles mixed Streamable HTTP batches and omits notification responses", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Batch Client/1.0" },
      body: JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "ping" },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "resources/templates/list" },
      ]),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { jsonrpc: "2.0", id: 1, result: {} },
      { jsonrpc: "2.0", id: 2, result: { resourceTemplates: [] } },
    ]);

    const activity: any = await (await app.request("/activity")).json();
    expect(activity.events).toHaveLength(3);
    expect(activity.events.every((event: { status: string }) => event.status === "success")).toBe(true);
  });

  it("acknowledges notification-only batches with an empty 202 response", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 1 } },
      ]),
    });

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("");
  });

  it("accepts client response envelopes without creating server activity", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 9, result: {} }),
    });

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("");
    await expect((await app.request("/activity")).json()).resolves.toEqual({
      events: [],
      facets: { clients: [], methods: [], statuses: [], tools: [], transports: [] },
      persistence: "process-memory",
    });
  });

  it("rejects empty JSON-RPC batches", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "[]",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32600 },
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

  it("accepts late cancellation notifications without logging a protocol error", async () => {
    const app = await createApp();
    const response = await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: 42, reason: "Sensitive user context" },
      }),
    });

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("");

    const activity: any = await (await app.request("/activity")).json();
    expect(activity.events[0]).toMatchObject({
      method: "notifications/cancelled",
      status: "success",
      parameters: { requestId: 42, hasReason: true },
    });
    expect(JSON.stringify(activity)).not.toContain("Sensitive user context");
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
      correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      parameters: { query: "landing" },
      result: { kind: "tool-result", blockCount: 1, contentTypes: ["text"] },
    });
    expect(JSON.stringify(payload)).not.toContain("must-not-leak");
  });

  it("correlates the client transport event with a sanitized upstream event", async () => {
    process.env.TEST_NOCO_MCP_URL = "https://nocodb-mcp.test/message";
    process.env.TEST_NOCO_MCP_TOKEN = "secret-token";
    vi.stubGlobal("fetch", vi.fn(async (_url, init: RequestInit) => {
      const request = JSON.parse(String(init.body));
      return Response.json({
        jsonrpc: "2.0",
        id: request.id,
        result: { content: [{ type: "text", text: "private upstream response" }] },
      });
    }));
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const app = createServer(registry);

    await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Codex Test/2.0" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 44,
        method: "tools/call",
        params: { name: "nocodb.list-tables", arguments: { token: "must-not-leak" } },
      }),
    });

    const payload: any = await (await app.request("/activity")).json();
    expect(payload.events).toHaveLength(2);
    expect(new Set(payload.events.map((event: { correlationId: string }) => event.correlationId)).size).toBe(1);
    expect(payload.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ transport: "http", target: "nocodb.list-tables" }),
      expect.objectContaining({
        transport: "upstream",
        client: "Codex Test/2.0",
        target: "nocodb.list-tables",
        upstream: { capabilityId: "nocodb", tool: "list-tables" },
        result: { kind: "upstream-response" },
      }),
    ]));
    expect(JSON.stringify(payload)).not.toContain("secret-token");
    expect(JSON.stringify(payload)).not.toContain("must-not-leak");
    expect(JSON.stringify(payload)).not.toContain("private upstream response");
  });

  it("does not retain raw upstream error messages", async () => {
    process.env.TEST_NOCO_MCP_URL = "https://nocodb-mcp.test/message";
    process.env.TEST_NOCO_MCP_TOKEN = "secret-token";
    vi.stubGlobal("fetch", vi.fn(async (_url, init: RequestInit) => {
      const request = JSON.parse(String(init.body));
      return Response.json({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32000, message: "Customer Jane Doe cannot access private workspace" },
      });
    }));
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const app = createServer(registry);

    await app.request("/message", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Codex Test/2.0" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 45,
        method: "tools/call",
        params: { name: "nocodb.list-tables", arguments: {} },
      }),
    });

    const payload: any = await (await app.request("/activity")).json();
    expect(payload.events).toHaveLength(2);
    expect(payload.events.every((event: { error?: { message: string } }) => (
      !event.error || event.error.message === "Upstream MCP request failed"
    ))).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("Jane Doe");
    expect(JSON.stringify(payload)).not.toContain("private workspace");
  });

  it("filters activity and exports the same selection as NDJSON", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
    const timestamps = ["2026-08-30T09:00:00.000Z", "2026-08-30T10:00:00.000Z"];
    const activityLog = new McpActivityLog(20, undefined, () => new Date(timestamps.shift()!));
    activityLog.record({
      client: "Claude 1.0",
      method: "tools/list",
      transport: "sse",
      status: "success",
      durationMs: 1,
    });
    activityLog.record({
      client: "Codex 2.0",
      method: "tools/call",
      target: "search-capabilities",
      transport: "http",
      status: "error",
      durationMs: 2,
      error: { code: -32000, message: "safe summary" },
    });
    const app = createServer(registry, {
      activityLog,
      activityPersistence: "process-memory+ndjson",
    });
    const query = "client=Codex%202.0&method=tools%2Fcall&tool=search-capabilities&status=error&transport=http&from=2026-08-30T09%3A30%3A00.000Z";

    const response = await app.request(`/activity?${query}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-mcpimp-activity-persistence")).toBe("process-memory+ndjson");
    await expect(response.json()).resolves.toMatchObject({
      persistence: "process-memory+ndjson",
      events: [{ client: "Codex 2.0", target: "search-capabilities" }],
    });

    const exported = await app.request(`/activity?${query}&format=ndjson&download=1`);
    expect(exported.status).toBe(200);
    expect(exported.headers.get("content-type")).toContain("application/x-ndjson");
    expect(exported.headers.get("content-disposition")).toContain("mcpimp-activity.ndjson");
    const lines = (await exported.text()).trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ client: "Codex 2.0", target: "search-capabilities" });
  });

  it("rejects invalid activity filters and export formats", async () => {
    const app = await createApp();

    for (const path of [
      "/activity?status=pending",
      "/activity?transport=stdio",
      "/activity?from=not-a-date",
      "/activity?from=2026-08-31T12%3A00%3A00Z&to=2026-08-31T11%3A00%3A00Z",
      "/activity?format=csv",
    ]) {
      const response = await app.request(path);
      expect(response.status, path).toBe(400);
    }
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
    expect(html).toContain("/upstreams");
    expect(html).toContain('href="#activity"');
    expect(html).toContain('id="activityRows"');
    expect(html).toContain('id="activityClientFilter"');
    expect(html).toContain('id="activityMethodFilter"');
    expect(html).toContain('id="activityToolFilter"');
    expect(html).toContain('id="activityStatusFilter"');
    expect(html).toContain('id="activityPeriodFilter"');
    expect(html).toContain('id="activityExportJson"');
    expect(html).toContain('id="activityExportNdjson"');
    expect(html).toContain("buildActivityQuery");
    expect(html).toContain("openActivityDrawer");
    expect(html).toContain("refreshUpstreams");
    expect(html).toContain('id="upstreamRows"');
    expect(html).toContain("Availability");
    expect(html).toContain("Tool cache");
    expect(html).toContain('role="dialog"');
    const inlineScript = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
    expect(inlineScript).toBeDefined();
    expect(() => new Function(inlineScript!)).not.toThrow();
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

  it("renders a compact review queue for imported capabilities", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(resolve("test/fixtures/synced-capabilities"));
    const app = createServer(registry);
    const response = await app.request("/dashboard");
    const html = await response.text();

    expect(html).toContain('href="#review"');
    expect(html).toContain('id="reviewRows"');
    expect(html).toContain("without-review");
    expect(html).toContain("unreviewed");
    expect(html).toContain("pnpm capabilities:review -- without-review --reviewer");
    expect(html).not.toContain("review-card");
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
