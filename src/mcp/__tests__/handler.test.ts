import { afterEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { createMcpHandler } from "../handler";
import { FileSystemCapabilityRegistry } from "../../registry/filesystem";

const fixturesRoot = resolve("test/fixtures/capabilities");
const upstreamFixturesRoot = resolve("test/fixtures/upstream-capabilities");

async function createHandler() {
  const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
  return createMcpHandler(registry);
}

describe("MCP handler", () => {
  it("initializes with tools and resources capabilities", async () => {
    const handle = await createHandler();

    await expect(handle({ jsonrpc: "2.0", id: 1, method: "initialize" })).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    });
  });

  it("lists the v1 registry tools", async () => {
    const handle = await createHandler();
    const response: any = await handle({ jsonrpc: "2.0", id: 2, method: "tools/list" });

    expect(response.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "list-capabilities",
      "capability-info",
      "load-capability",
      "search-capabilities",
      "list-upstreams",
    ]);
  });

  it("calls list-capabilities", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list-capabilities", arguments: {} },
    });

    expect(response.result.content[0].text).toContain("landing-page");
  });

  it("returns optional search score diagnostics", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 31,
      method: "tools/call",
      params: {
        name: "search-capabilities",
        arguments: { query: "landing page", diagnostic: true },
      },
    });
    const [result] = JSON.parse(response.result.content[0].text);

    expect(result.diagnostics).toMatchObject({
      coverage: 1,
      fileWeight: 1.4,
    });
    expect(result.diagnostics.terms.length).toBeGreaterThan(0);
    expect(result.diagnostics.fields.length).toBeGreaterThan(0);
  });

  it("lists and reads resources", async () => {
    const handle = await createHandler();

    const list: any = await handle({ jsonrpc: "2.0", id: 4, method: "resources/list" });
    expect(list.result.resources[0].uri).toBe("skill://landing-page/SKILL.md");

    const read: any = await handle({
      jsonrpc: "2.0",
      id: 5,
      method: "resources/read",
      params: { uri: "skill://landing-page/SKILL.md" },
    });
    expect(read.result.contents[0].text).toContain("# Landing Page");
  });

  it("returns an empty list for the standard resource-template probe", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 51,
      method: "resources/templates/list",
    });

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 51,
      result: { resourceTemplates: [] },
    });
  });

  it("keeps non-standard discovery probes as method-not-found errors", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 52,
      method: "server/discover",
    });

    expect(response).toMatchObject({
      error: { code: -32601, message: "Unknown method: server/discover" },
    });
  });

  it("loads one exact capability file for progressive disclosure", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "load-capability",
        arguments: { id: "landing-page", path: "shared/rules.md" },
      },
    });

    expect(response.result.content[0].text).toContain("# Rules");
    expect(response.result.content[0].text).not.toContain("# Landing Page");
  });

  it("returns a JSON-RPC error for missing resources", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 7,
      method: "resources/read",
      params: { uri: "skill://landing-page/missing.md" },
    });

    expect(response.error.message).toContain("Resource not found");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TEST_NOCO_MCP_URL;
    delete process.env.TEST_NOCO_MCP_TOKEN;
  });

  it("lists upstream MCP readiness without requiring the upstream to be reachable", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const handle = createMcpHandler(registry);
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "list-upstreams", arguments: {} },
    });

    expect(response.result.content[0].text).toContain("missing-env");
    expect(response.result.content[0].text).toContain("TEST_NOCO_MCP_URL");
  });

  it("proxies namespaced tools to an upstream HTTP MCP server", async () => {
    process.env.TEST_NOCO_MCP_URL = "https://nocodb-mcp.test/message";
    process.env.TEST_NOCO_MCP_TOKEN = "secret-token";

    const requests: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init: any) => {
        requests.push({ url: _url, init });
        const body = JSON.parse(init.body);
        const result =
          body.method === "tools/list"
            ? {
                tools: [
                  {
                    name: "list-tables",
                    description: "List NocoDB tables.",
                    inputSchema: { type: "object", properties: {}, required: [] },
                  },
                ],
              }
            : { content: [{ type: "text", text: "tables: contacts" }] };

        return Response.json({ jsonrpc: "2.0", id: body.id, result });
      }),
    );

    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const handle = createMcpHandler(registry);
    const tools: any = await handle({ jsonrpc: "2.0", id: 8, method: "tools/list" });
    expect(tools.result.tools.map((tool: { name: string }) => tool.name)).toContain("nocodb.list-tables");

    const call: any = await handle({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: { name: "nocodb.list-tables", arguments: {} },
    });

    expect(call.result.content[0].text).toBe("tables: contacts");
    const nocodbRequest = requests.find((request) => request.url === "https://nocodb-mcp.test/message");
    expect(nocodbRequest).toBeDefined();
    expect(nocodbRequest.init.headers["xc-mcp-token"]).toBe("secret-token");
    expect(nocodbRequest.init.headers.accept).toBe("application/json, text/event-stream");
  });

  it("parses event-stream responses from an upstream HTTP MCP server", async () => {
    process.env.TEST_NOCO_MCP_URL = "https://nocodb-mcp.test/message";
    process.env.TEST_NOCO_MCP_TOKEN = "secret-token";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init: any) => {
        const body = JSON.parse(init.body);
        const result = { content: [{ type: "text", text: "base: KRT" }] };

        return new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: body.id, result })}\n\n`, {
          headers: { "content-type": "text/event-stream" },
        });
      }),
    );

    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const handle = createMcpHandler(registry);
    const call: any = await handle({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: { name: "nocodb.getBaseInfo", arguments: {} },
    });

    expect(call.result.content[0].text).toBe("base: KRT");
  });
});
