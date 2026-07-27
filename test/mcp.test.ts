import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../src/registry";
import { createMcpHandler } from "../src/mcp";

const fixturesRoot = resolve("test/fixtures/capabilities");

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
    const response = await handle({ jsonrpc: "2.0", id: 2, method: "tools/list" });

    expect(response.result.tools.map((tool) => tool.name)).toEqual([
      "list-capabilities",
      "capability-info",
      "load-capability",
      "search-capabilities",
    ]);
  });

  it("calls list-capabilities", async () => {
    const handle = await createHandler();
    const response = await handle({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list-capabilities", arguments: {} },
    });

    expect(response.result.content[0].text).toContain("landing-page");
  });

  it("lists and reads resources", async () => {
    const handle = await createHandler();

    const list = await handle({ jsonrpc: "2.0", id: 4, method: "resources/list" });
    expect(list.result.resources[0].uri).toBe("skill://landing-page/SKILL.md");

    const read = await handle({
      jsonrpc: "2.0",
      id: 5,
      method: "resources/read",
      params: { uri: "skill://landing-page/SKILL.md" },
    });
    expect(read.result.contents[0].text).toContain("# Landing Page");
  });

  it("returns a JSON-RPC error for missing resources", async () => {
    const handle = await createHandler();
    const response = await handle({
      jsonrpc: "2.0",
      id: 6,
      method: "resources/read",
      params: { uri: "skill://landing-page/missing.md" },
    });

    expect(response.error.message).toContain("Resource not found");
  });
});
