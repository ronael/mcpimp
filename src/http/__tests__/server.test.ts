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

    expect(html).toContain("Le serveur scanne les dossiers racine");
    expect(html).toContain("/health");
    expect(html).toContain("/message");
    expect(html).toContain("list-capabilities");
    expect(html).toContain("search-capabilities");
    expect(html).toContain("skill://landing-page/SKILL.md");
    expect(html).toContain("Sources & références");
    expect(html).toContain("https://example.com/source");
  });
});
