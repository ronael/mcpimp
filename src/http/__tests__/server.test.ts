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
});
