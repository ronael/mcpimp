import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../filesystem";
import { createMcpHandler } from "../../mcp/handler";

const CATALOG_ROOT = resolve("catalog/capabilities/skills");

const requiredNames = [
  "landing-page",
  "ui-ux-pro-max",
  "baseline-ui",
  "improve-ui",
  "fixing-accessibility",
  "fixing-motion-performance",
  "create-design-md",
];

describe("design capability catalog", () => {
  it("keeps every required design skill present, loadable and provenance-aware", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const capabilities = registry.listCapabilities();
    const byName = new Map(capabilities.map((capability) => [capability.name, capability]));

    for (const name of requiredNames) {
      const capability = byName.get(name);
      expect(capability, `${name} should be discoverable`).toBeDefined();
      expect(capability?.files.find((file) => file.path === "SKILL.md")?.text, `${name} should load SKILL.md`)
        .toBeTruthy();
    }

    expect(byName.get("ui-ux-pro-max")?.origin).toMatchObject({
      repository: "nextlevelbuilder/ui-ux-pro-max-skill",
      path: ".claude/skills/ui-ux-pro-max",
      license: { spdxId: "MIT" },
    });
    expect(byName.has("ui-ux-pro-max-skill-design-system")).toBe(false);
  });

  it("finds the real UI/UX capabilities through representative queries", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const cases = [
      ["landing visual identity", "ui-ux-pro-max"],
      ["accessibility keyboard contrast", "ui-skills-fixing-accessibility"],
      ["motion performance animation", "ui-skills-fixing-motion-performance"],
      ["baseline typography spacing", "ui-skills-baseline-ui"],
      ["design language DESIGN.md", "ui-skills-create-design-md"],
      ["audit refine interface", "ui-skills-improve-ui"],
    ] as const;

    for (const [query, expectedId] of cases) {
      const results = registry.search(query, { limit: 20 });
      expect(results.some((result) => result.capabilityId === expectedId), query).toBe(true);
      expect(results.every((result) => result.capabilityId !== "ui-ux-pro-max-skill-design-system"), query)
        .toBe(true);
    }
  });

  it("keeps the local landing orchestrator minimal", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const landing = registry.listCapabilities().find((capability) => capability.id === "landing-page");

    expect(landing?.files.map((file) => file.path)).toEqual(["SKILL.md"]);
  });

  it("exposes the selected capability through the MCP tool flow", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const handle = createMcpHandler(registry);

    const search: any = await handle({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "search-capabilities", arguments: { query: "landing visual identity", limit: 10 } },
    });
    const results = JSON.parse(search.result.content[0].text);
    const hit = results.find((result: { capabilityId: string }) => result.capabilityId === "ui-ux-pro-max");
    expect(hit).toMatchObject({
      capabilityName: "ui-ux-pro-max",
      capabilityDescription: expect.stringContaining("UI/UX design intelligence"),
    });

    const info: any = await handle({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "capability-info", arguments: { id: "ui-ux-pro-max" } },
    });
    expect(JSON.parse(info.result.content[0].text).origin).toMatchObject({
      repository: "nextlevelbuilder/ui-ux-pro-max-skill",
      license: { spdxId: "MIT" },
    });

    const loaded: any = await handle({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "load-capability", arguments: { id: "ui-ux-pro-max", section: "skill" } },
    });
    expect(loaded.result.content[0].text).toContain("# UI/UX Pro Max - Design Intelligence");
  });
});
