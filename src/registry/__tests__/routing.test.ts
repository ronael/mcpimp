import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "../routing";
import type { Capability, CapabilityRegistry, CapabilitySearchOptions, CapabilitySearchResult } from "../types";

function capability(
  id: string,
  description: string,
  routing?: Capability["routing"],
  text = `# ${id}\n\n## Workflow\n\nApply ${description}.`,
): Capability {
  return {
    id,
    namespace: "test",
    slug: id,
    name: id,
    description,
    components: { skill: true, mcp: false },
    routing,
    files: [{
      capabilityId: id,
      path: "SKILL.md",
      uri: `skill://${id}/SKILL.md`,
      name: `${id}/SKILL.md`,
      type: "skill",
      mimeType: "text/markdown",
      text,
      lines: 5,
      bytes: text.length,
      binary: false,
    }],
  };
}

class RoutingRegistry implements CapabilityRegistry {
  constructor(private readonly capabilities: Capability[], private readonly results: CapabilitySearchResult[]) {}
  listCapabilities() { return this.capabilities; }
  getCapability(id: string) { return this.capabilities.find((candidate) => candidate.id === id); }
  listUpstreamMcpServers() { return []; }
  listResources() { return []; }
  readResource(): never { throw new Error("not used"); }
  search(_query: string, _options?: CapabilitySearchOptions) { return this.results; }
}

function hit(id: string, score: number): CapabilitySearchResult {
  return {
    capabilityId: id,
    capabilityName: id,
    capabilityDescription: id,
    path: "SKILL.md",
    uri: `skill://${id}/SKILL.md`,
    title: id,
    snippet: "",
    score,
    matchedTerms: [],
  };
}

describe("capability routing", () => {
  it("uses local routing intent to choose a specialist over a lexical generalist", () => {
    const specialist = capability("specialist", "Focused structural landing design", {
      schemaVersion: 1,
      role: "specialist",
      taskModes: ["create"],
      useWhen: ["new visual page requiring structural variety"],
      avoidWhen: [],
      conflictsWith: ["generalist"],
      complements: ["accessibility"],
    });
    const generalist = capability("generalist", "Broad UI design", {
      schemaVersion: 1,
      role: "generalist",
      taskModes: ["create", "redesign", "audit"],
      useWhen: ["general UI design"],
      avoidWhen: [],
      conflictsWith: [],
      complements: [],
    });
    const accessibility = capability("accessibility", "Keyboard focus and contrast");
    const registry = new RoutingRegistry(
      [specialist, generalist, accessibility],
      [hit("generalist", 12), hit("specialist", 10), hit("accessibility", 7)],
    );

    const result = resolveCapabilities(registry, {
      task: "Create a new visual landing page with structural variety and keyboard accessibility",
      taskMode: "create",
      maxCapabilities: 3,
      maxCharacters: 8_000,
    });

    expect(result.primary).not.toBeNull();
    if (!result.primary) throw new Error("Expected a primary capability");
    expect(result.primary.id).toBe("specialist");
    expect(result.primary.reviewStatus).toBe("local");
    expect(result.primary.reasonCodes).toContain("routing-use-when");
    expect(result.supporting.map((candidate) => candidate.id)).toContain("accessibility");
    expect(result.supporting.map((candidate) => candidate.id)).not.toContain("generalist");
    expect(result.conflicts).toContainEqual({
      ids: ["generalist", "specialist"],
      reason: "routing-conflict",
    });
    expect(result.budget.estimated).toBeLessThanOrEqual(result.budget.maximum);
    expect(result.primary.entrypoints[0]).toMatchObject({ path: "SKILL.md", heading: "Workflow" });
  });

  it("returns insufficient confidence when retrieval finds nothing", () => {
    const result = resolveCapabilities(new RoutingRegistry([], []), { task: "Unknown task" });

    expect(result).toMatchObject({
      primary: null,
      supporting: [],
      conflicts: [],
      confidence: "insufficient",
    });
  });

  it("does not add a generalist to a resource lookup without an explicit complement", () => {
    const resources = capability("component-resources", "Component galleries and shadcn references");
    const generalist = capability("ui-generalist", "Broad UI design guidance", {
      schemaVersion: 1,
      role: "generalist",
      taskModes: ["create", "redesign", "audit"],
      useWhen: ["general UI design"],
      avoidWhen: [],
      conflictsWith: [],
      complements: [],
    });
    const registry = new RoutingRegistry(
      [resources, generalist],
      [hit("component-resources", 12), hit("ui-generalist", 9)],
    );

    const result = resolveCapabilities(registry, {
      task: "Find component galleries and shadcn resources",
    });

    expect(result.primary?.id).toBe("component-resources");
    expect(result.supporting).toEqual([]);
  });

  it("lets an exact business routing intent outrank a lexical frequency outlier without taskMode", () => {
    const resources = capability("component-resources", "Curated references", {
      schemaVersion: 1,
      role: "resource",
      taskModes: ["research"],
      useWhen: ["component galleries", "shadcn examples"],
      avoidWhen: [],
      conflictsWith: [],
      complements: [],
    });
    const repeatedText = "component galleries shadcn examples ".repeat(100);
    const lexicalOutlier = capability("generic-ui", "Broad UI advice", undefined, repeatedText);
    const registry = new RoutingRegistry(
      [resources, lexicalOutlier],
      [hit("generic-ui", 100), hit("component-resources", 1)],
    );

    const result = resolveCapabilities(registry, {
      task: "Find concrete component galleries and shadcn examples",
    });

    expect(result.primary?.id).toBe("component-resources");
    expect(result.primary?.reasonCodes).toContain("routing-use-when");
  });
});
