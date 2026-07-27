import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../src/registry";
import { createServer } from "../src/server";

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
});
