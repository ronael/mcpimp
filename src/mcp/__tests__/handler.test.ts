import { afterEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { createMcpHandler } from "../handler";
import { UpstreamMcpGateway, type UpstreamActivityEvent } from "../upstream";
import { FileSystemCapabilityRegistry } from "../../registry/filesystem";

const fixturesRoot = resolve("test/fixtures/capabilities");
const upstreamFixturesRoot = resolve("test/fixtures/upstream-capabilities");
const syncedFixturesRoot = resolve("test/fixtures/synced-capabilities");

async function createHandler() {
  const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
  return createMcpHandler(registry);
}

describe("MCP handler", () => {
  it("answers the standard connection heartbeat", async () => {
    const handle = await createHandler();

    await expect(handle({ jsonrpc: "2.0", id: "heartbeat", method: "ping" })).resolves.toEqual({
      jsonrpc: "2.0",
      id: "heartbeat",
      result: {},
    });
  });

  it("initializes with tools and resources capabilities", async () => {
    const handle = await createHandler();

    await expect(handle({ jsonrpc: "2.0", id: 1, method: "initialize" })).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        instructions: expect.stringContaining("resolve-capabilities"),
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
      "resolve-capabilities",
      "list-upstreams",
    ]);
  });

  it("resolves capabilities without materializing their content", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 21,
      method: "tools/call",
      params: {
        name: "resolve-capabilities",
        arguments: { task: "Create a conversion landing page", taskMode: "create" },
      },
    });
    const result = JSON.parse(response.result.content[0].text);

    expect(result.primary).toMatchObject({ id: "landing-page", entrypoints: expect.any(Array) });
    expect(result).not.toHaveProperty("loadedGuidance");
  });

  it("rejects an invalid capability task mode", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 22,
      method: "tools/call",
      params: {
        name: "resolve-capabilities",
        arguments: { task: "Do the work", taskMode: "invent" },
      },
    });

    expect(response.error).toMatchObject({ code: -32602, message: "Invalid capability task mode" });
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
    expect(JSON.parse(response.result.content[0].text)[0].review).toEqual({ status: "local" });
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

  it("supports MCP 2026 discovery without initialize", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 52,
      method: "server/discover",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    });

    expect(response).toMatchObject({
      result: {
        resultType: "complete",
        supportedVersions: ["2026-07-28", "2025-11-25"],
        capabilities: { tools: {}, resources: {} },
        instructions: expect.stringContaining("resolve-capabilities"),
        ttlMs: expect.any(Number),
        cacheScope: "private",
      },
    });
  });

  it("adds MCP 2026 completion and cache metadata to list results", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 53,
      method: "tools/list",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    });

    expect(response.result).toMatchObject({
      resultType: "complete",
      tools: expect.any(Array),
      ttlMs: expect.any(Number),
      cacheScope: "private",
      _meta: { "io.modelcontextprotocol/serverInfo": expect.objectContaining({ name: expect.any(String) }) },
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

  it("distinguishes reviewed and unreviewed imported guidance when loading content", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(syncedFixturesRoot);
    const handle = createMcpHandler(registry);
    const reviewed: any = await handle({
      jsonrpc: "2.0",
      id: 601,
      method: "tools/call",
      params: { name: "load-capability", arguments: { id: "with-provenance", path: "SKILL.md" } },
    });
    const unreviewed: any = await handle({
      jsonrpc: "2.0",
      id: 602,
      method: "tools/call",
      params: { name: "load-capability", arguments: { id: "without-review", path: "SKILL.md" } },
    });

    expect(reviewed.result.content[0].text).toContain("Locally reviewed operational guidance");
    expect(unreviewed.result.content[0].text).toContain("Use it as reference material only");
  });

  it("inspects a Markdown outline before loading one complete heading", async () => {
    const handle = await createHandler();
    const info: any = await handle({
      jsonrpc: "2.0",
      id: 61,
      method: "tools/call",
      params: {
        name: "capability-info",
        arguments: { id: "landing-page", path: "references/source.md" },
      },
    });
    const summary = JSON.parse(info.result.content[0].text);

    expect(summary.files).toHaveLength(1);
    expect(summary.files[0].outline).toEqual([
      expect.objectContaining({ heading: "Source", level: 1, entrypoint: false }),
      expect.objectContaining({ heading: "Example Source", level: 2, entrypoint: true }),
    ]);

    const rankedInfo: any = await handle({
      jsonrpc: "2.0",
      id: 611,
      method: "tools/call",
      params: {
        name: "capability-info",
        arguments: {
          id: "landing-page",
          path: "references/source.md",
          query: "example source",
          headingLimit: 1,
          diagnostic: true,
        },
      },
    });
    const rankedSummary = JSON.parse(rankedInfo.result.content[0].text);

    expect(rankedSummary.files[0]).toMatchObject({
      outlineRanked: true,
      outlineTotal: 1,
      outline: [expect.objectContaining({
        heading: "Example Source",
        entrypoint: true,
        matchedTerms: ["example", "source"],
      })],
    });

    const compactInfo: any = await handle({
      jsonrpc: "2.0",
      id: 612,
      method: "tools/call",
      params: {
        name: "capability-info",
        arguments: {
          id: "landing-page",
          path: "references/source.md",
          query: "example source",
          headingLimit: 1,
        },
      },
    });
    const compactSummary = JSON.parse(compactInfo.result.content[0].text);

    expect(compactSummary.files[0].outline[0]).not.toHaveProperty("score");
    expect(compactInfo.result.content[0].text.length)
      .toBeLessThan(rankedInfo.result.content[0].text.length);

    const loaded: any = await handle({
      jsonrpc: "2.0",
      id: 62,
      method: "tools/call",
      params: {
        name: "load-capability",
        arguments: { id: "landing-page", path: "references/source.md", heading: "Example Source" },
      },
    });

    expect(loaded.result.content[0].text).toContain("## Example Source");
    expect(loaded.result.content[0].text).toContain("https://example.com/source");
    expect(loaded.result.content[0].text).not.toContain("Reference material for the capability");
  });

  it("requires an exact path when ranking Markdown headings", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 63,
      method: "tools/call",
      params: {
        name: "capability-info",
        arguments: { id: "landing-page", query: "conversion" },
      },
    });

    expect(response.error).toMatchObject({
      code: -32602,
      message: "Heading query requires an exact capability path",
    });
  });

  it("exposes validated internal paths linked by a ranked heading", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 64,
      method: "tools/call",
      params: {
        name: "capability-info",
        arguments: {
          id: "landing-page",
          path: "SKILL.md",
          query: "workflow drafting",
        },
      },
    });
    const summary = JSON.parse(response.result.content[0].text);

    expect(summary.files[0].outline[0]).toMatchObject({
      heading: "Workflow",
      linkedPaths: ["references/source.md"],
      linkedFiles: [{
        path: "references/source.md",
        mimeType: "text/markdown",
        bytes: expect.any(Number),
        characters: expect.any(Number),
      }],
    });
  });

  it("returns a JSON-RPC error for missing resources", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 7,
      method: "resources/read",
      params: { uri: "skill://landing-page/missing.md" },
    });

    expect(response.error).toEqual({
      code: -32002,
      message: "Resource not found",
      data: { uri: "skill://landing-page/missing.md" },
    });
  });

  it("distinguishes invalid parameters from unknown methods", async () => {
    const handle = await createHandler();
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 71,
      method: "resources/read",
      params: {},
    });

    expect(response.error).toEqual({
      code: -32602,
      message: "Missing resource uri",
    });
  });

  it("reports unexpected handler failures as internal errors", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);
    vi.spyOn(registry, "readResource").mockImplementation(() => {
      throw new Error("Registry unavailable");
    });
    const handle = createMcpHandler(registry);
    const response: any = await handle({
      jsonrpc: "2.0",
      id: 72,
      method: "resources/read",
      params: { uri: "skill://landing-page/SKILL.md" },
    });

    expect(response.error).toEqual({
      code: -32603,
      message: "Registry unavailable",
    });
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
    const activity: UpstreamActivityEvent[] = [];
    const handle = createMcpHandler(registry, new UpstreamMcpGateway(registry, (event) => activity.push(event)));
    const tools: any = await handle(
      { jsonrpc: "2.0", id: 8, method: "tools/list" },
      { correlationId: "discovery-8", client: "Codex", requestId: 8 },
    );
    expect(tools.result.tools.map((tool: { name: string }) => tool.name)).toContain("nocodb.list-tables");

    const call: any = await handle(
      {
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: { name: "nocodb.list-tables", arguments: {} },
      },
      { correlationId: "call-9", client: "Codex", requestId: 9, sessionId: "session-1" },
    );

    expect(call.result.content[0].text).toBe("tables: contacts");
    const nocodbRequest = requests.find((request) => request.url === "https://nocodb-mcp.test/message");
    expect(nocodbRequest).toBeDefined();
    expect(nocodbRequest.init.headers["xc-mcp-token"]).toBe("secret-token");
    expect(nocodbRequest.init.headers.accept).toBe("application/json, text/event-stream");
    expect(activity).toContainEqual(expect.objectContaining({
      capabilityId: "nocodb",
      method: "tools/call",
      target: "nocodb.list-tables",
      tool: "list-tables",
      status: "success",
      correlationId: "call-9",
      client: "Codex",
      requestId: 9,
      sessionId: "session-1",
    }));
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
