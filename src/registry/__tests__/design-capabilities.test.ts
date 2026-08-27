import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../filesystem";
import { extractLinkedCapabilityPaths } from "../markdown-links";
import { rankMarkdownSections } from "../section-search";
import { createMcpHandler } from "../../mcp/handler";
import { HEADING_EVALUATION_CORPUS } from "../../../test/evaluation/heading-corpus";

const CATALOG_ROOT = resolve("catalog/capabilities");

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
      ["accessibility contrast", "ui-skills-fixing-accessibility"],
      ["motion performance animation", "ui-skills-fixing-motion-performance"],
      ["baseline typography spacing", "ui-skills-baseline-ui"],
      ["design language DESIGN.md", "ui-skills-create-design-md"],
      ["audit refine interface", "ui-skills-improve-ui"],
      ["improve ui", "ui-skills-improve-ui"],
      ["visual inspiration branding 3D print", "visual-design-resources"],
      ["beautiful ui ai native approval card", "ui-component-resources"],
      ["beui rare ui shadcn animated components", "ui-component-resources"],
      ["transitions card resize modal number pop-in", "motion-design-resources"],
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

  it("recognises NocoDB as a composite skill + mcp capability", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const nocodb = registry.getCapability("nocodb");

    expect(nocodb).toMatchObject({
      namespace: "local",
      slug: "nocodb",
      components: { skill: true, mcp: true },
    });
    expect(registry.listUpstreamMcpServers().some((server) => server.capabilityId === "nocodb")).toBe(true);
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

  it("loads bounded Markdown entrypoints for two real capabilities", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const handle = createMcpHandler(registry);
    const cases = [
      {
        id: "elaya-design-landing-page-design",
        heading: "PART A — Strategy and structure",
        firstHeadingIsEntrypoint: true,
      },
      {
        id: "frontend-architecture",
        heading: "Workflow",
        firstHeadingIsEntrypoint: false,
      },
    ];

    for (const [index, entry] of cases.entries()) {
      const info: any = await handle({
        jsonrpc: "2.0",
        id: 20 + index,
        method: "tools/call",
        params: {
          name: "capability-info",
          arguments: { id: entry.id, path: "SKILL.md" },
        },
      });
      const outline = JSON.parse(info.result.content[0].text).files[0].outline;
      expect(outline).toContainEqual(expect.objectContaining({
        heading: entry.heading,
        entrypoint: true,
      }));
      expect(outline[0]).toEqual(expect.objectContaining({
        entrypoint: entry.firstHeadingIsEntrypoint,
      }));

      const full: any = await handle({
        jsonrpc: "2.0",
        id: 30 + index,
        method: "tools/call",
        params: { name: "load-capability", arguments: { id: entry.id, path: "SKILL.md" } },
      });
      const partial: any = await handle({
        jsonrpc: "2.0",
        id: 40 + index,
        method: "tools/call",
        params: {
          name: "load-capability",
          arguments: { id: entry.id, path: "SKILL.md", heading: entry.heading },
        },
      });

      expect(partial.result.content[0].text).toContain(entry.heading);
      expect(partial.result.content[0].text.length).toBeLessThan(full.result.content[0].text.length / 2);
    }
  });

  it("ranks useful headings for real agent intentions", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    for (const entry of HEADING_EVALUATION_CORPUS) {
      const markdown = registry.getCapability(entry.capabilityId)?.files
        .find((file) => file.path === entry.path)?.text;
      expect(markdown, `${entry.capabilityId}/${entry.path} should exist`).toBeTruthy();
      const [top] = rankMarkdownSections(markdown || "", entry.query, 3);
      expect(top?.heading).toBe(entry.expectedHeading);

      if (entry.expectedLinkedPaths) {
        const capability = registry.getCapability(entry.capabilityId);
        expect(extractLinkedCapabilityPaths(
          top?.text || "",
          entry.path,
          capability?.files.map((file) => file.path) || [],
        )).toEqual(entry.expectedLinkedPaths);
      }
    }
  });
});
