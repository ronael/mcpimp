import { afterEach, describe, expect, it, vi } from "vitest";
import { FileSystemCapabilityRegistry } from "../../registry/filesystem";
import { createMcpHandler } from "../handler";
import { UpstreamMcpGateway, type UpstreamActivityEvent } from "../upstream";
import { resolve } from "node:path";

const upstreamFixturesRoot = resolve("test/fixtures/upstream-capabilities");

function upstreamResponse(init: RequestInit | undefined, tools: Array<{ name: string; description?: string }>) {
  const body = JSON.parse(String(init?.body));
  return Response.json({ jsonrpc: "2.0", id: body.id, result: { tools } });
}

describe("UpstreamMcpGateway tool discovery", () => {
  afterEach(() => {
    delete process.env.TEST_NOCO_MCP_URL;
    delete process.env.TEST_NOCO_MCP_TOKEN;
  });

  it("isolates one upstream failure and preserves local plus healthy upstream tools", async () => {
    process.env.TEST_NOCO_MCP_URL = "https://nocodb-mcp.test/message";
    process.env.TEST_NOCO_MCP_TOKEN = "secret-token";
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === "https://nocodb-mcp.test/message") {
        return upstreamResponse(init, [{ name: "list-tables", description: "List tables" }]);
      }
      throw new Error("provider credentials leaked in raw failure");
    });
    const gateway = new UpstreamMcpGateway(registry, undefined, { fetch: fetcher });
    const handle = createMcpHandler(registry, gateway);

    const response: any = await handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const names = response.result.tools.map((tool: { name: string }) => tool.name);

    expect(names).toContain("list-capabilities");
    expect(names).toContain("nocodb.list-tables");
    expect(response.error).toBeUndefined();
    expect(gateway.listUpstreams()).toEqual(expect.arrayContaining([
      expect.objectContaining({ capabilityId: "crm-connector", reachable: false }),
      expect.objectContaining({ capabilityId: "nocodb", reachable: true }),
    ]));
    expect(JSON.stringify(gateway.listUpstreams())).not.toContain("credentials leaked");
  });

  it("aborts an upstream tool discovery after the explicit timeout", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const activity: UpstreamActivityEvent[] = [];
    const fetcher = vi.fn((_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));
    const gateway = new UpstreamMcpGateway(registry, (event) => activity.push(event), {
      fetch: fetcher,
      requestTimeoutMs: 5,
    });

    await expect(gateway.listTools()).resolves.toEqual([]);

    expect(activity).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: "tools/list", status: "error" }),
    ]));
    expect(gateway.listUpstreams()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        capabilityId: "crm-connector",
        reachable: false,
        lastError: { code: "timeout", message: "Upstream MCP request timed out" },
      }),
    ]));
  });

  it("reuses a fresh tool cache and refreshes it after the TTL", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    let now = 1_000;
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => (
      upstreamResponse(init, [{ name: `tool-${fetcher.mock.calls.length}` }])
    ));
    const gateway = new UpstreamMcpGateway(registry, undefined, {
      fetch: fetcher,
      now: () => now,
      toolListTtlMs: 100,
    });

    const first = await gateway.listTools();
    const second = await gateway.listTools();
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(gateway.listUpstreams()).toEqual(expect.arrayContaining([
      expect.objectContaining({ capabilityId: "crm-connector", cacheStatus: "fresh" }),
    ]));

    now += 101;
    const refreshed = await gateway.listTools();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(refreshed).not.toEqual(first);
  });

  it("coalesces concurrent refreshes and rejects invalid timing policies", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => (
      upstreamResponse(init, [{ name: "shared-tool" }])
    ));
    const gateway = new UpstreamMcpGateway(registry, undefined, { fetch: fetcher });

    await Promise.all([gateway.listTools(), gateway.listTools(), gateway.listTools()]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(gateway.policy()).toEqual({
      requestTimeoutMs: 5_000,
      toolListTtlMs: 60_000,
      staleOnError: true,
    });
    expect(() => new UpstreamMcpGateway(registry, undefined, { requestTimeoutMs: 0 })).toThrow(
      "requestTimeoutMs must be a positive finite number",
    );
    expect(() => new UpstreamMcpGateway(registry, undefined, { toolListTtlMs: -1 })).toThrow(
      "toolListTtlMs must be a positive finite number",
    );
  });

  it("serves stale cached tools when a refresh fails and exposes invalidation", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    let now = 1_000;
    let failing = false;
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (failing) throw new Error("private provider response");
      return upstreamResponse(init, [{ name: "stable-tool" }]);
    });
    const gateway = new UpstreamMcpGateway(registry, undefined, {
      fetch: fetcher,
      now: () => now,
      toolListTtlMs: 100,
    });

    const initial = await gateway.listTools();
    gateway.invalidateToolCache("crm-connector", "manual");
    failing = true;
    now += 101;
    const stale = await gateway.listTools();

    expect(stale).toEqual(expect.arrayContaining(initial.filter((tool) => tool.name.startsWith("crm-connector."))));
    expect(gateway.listUpstreams()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        capabilityId: "crm-connector",
        reachable: false,
        cacheStatus: "stale",
        lastInvalidationReason: "manual",
      }),
    ]));
    expect(JSON.stringify(gateway.listUpstreams())).not.toContain("private provider response");
  });
});
