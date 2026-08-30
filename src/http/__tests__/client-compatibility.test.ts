import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { createServer } from "../server";
import { FileSystemCapabilityRegistry } from "../../registry/filesystem";

const fixturesRoot = resolve("test/fixtures/capabilities");

async function createApp() {
  return createServer(await FileSystemCapabilityRegistry.scan(fixturesRoot));
}

function message(body: unknown, userAgent: string) {
  return {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": userAgent },
    body: JSON.stringify(body),
  };
}

describe("observed MCP client sequences", () => {
  it("keeps the Codex discovery sequence successful", async () => {
    const app = await createApp();
    const userAgent = "codex-mcp-client/0.149.1";

    const initialize = await app.request("/message", message({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        clientInfo: { name: "codex-mcp-client", version: "0.149.1" },
      },
    }, userAgent));
    expect(initialize.status).toBe(200);
    await expect(initialize.json()).resolves.toMatchObject({
      result: { protocolVersion: "2025-06-18" },
    });

    const initialized = await app.request("/message", message({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    }, userAgent));
    expect(initialized.status).toBe(202);
    await expect(initialized.text()).resolves.toBe("");

    for (const [id, method] of [
      [2, "tools/list"],
      [3, "resources/list"],
      [4, "resources/templates/list"],
      [5, "ping"],
    ] as const) {
      const response = await app.request("/message", message({ jsonrpc: "2.0", id, method }, userAgent));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ jsonrpc: "2.0", id });
    }

    const activity: any = await (await app.request("/activity")).json();
    expect(activity.events).toHaveLength(6);
    expect(activity.events.every((event: { status: string }) => event.status === "success")).toBe(true);
  });

  it("keeps working after Claude probes server/discover", async () => {
    const app = await createApp();
    const userAgent = "claude-code/2.1.241 (claude-desktop, agent-sdk/0.3.246)";

    const discovery = await app.request("/message", message({
      jsonrpc: "2.0",
      id: 1,
      method: "server/discover",
    }, userAgent));
    await expect(discovery.json()).resolves.toMatchObject({
      result: { resultType: "complete", supportedVersions: expect.arrayContaining(["2026-07-28"]) },
    });

    const initialize = await app.request("/message", message({
      jsonrpc: "2.0",
      id: 2,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        clientInfo: { name: "claude-code", version: "2.1.241" },
      },
    }, userAgent));
    await expect(initialize.json()).resolves.toMatchObject({ result: { serverInfo: expect.any(Object) } });

    const initialized = await app.request("/message", message({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    }, userAgent));
    expect(initialized.status).toBe(202);

    for (const [id, method] of [
      [3, "resources/list"],
      [4, "resources/templates/list"],
      [5, "tools/list"],
    ] as const) {
      const response = await app.request("/message", message({ jsonrpc: "2.0", id, method }, userAgent));
      await expect(response.json()).resolves.toMatchObject({ jsonrpc: "2.0", id, result: expect.any(Object) });
    }

    const activity: any = await (await app.request("/activity")).json();
    expect(activity.events).toHaveLength(6);
    expect(activity.events.every((event: { status: string }) => event.status === "success")).toBe(true);
    expect(activity.events[0]).toMatchObject({ method: "tools/list", status: "success" });
  });
});
