import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../filesystem";

const fixturesRoot = resolve("test/fixtures/capabilities");

describe("FileSystemCapabilityRegistry", () => {
  it("discovers folders that contain a SKILL.md", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.listCapabilities()).toMatchObject([
      {
        id: "landing-page",
        name: "landing-page",
        description: "Build premium landing pages with a structured expert workflow.",
      },
    ]);
  });

  it("does not expose folders without a SKILL.md as capabilities", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.getCapability("invalid-no-skill")).toBeUndefined();
  });

  it("lists stable resources for a capability", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.listResources().map((resource) => resource.uri)).toEqual([
      "skill://landing-page/SKILL.md",
      "skill://landing-page/README.md",
      "skill://landing-page/agents/designer.md",
      "skill://landing-page/shared/rules.md",
    ]);
  });

  it("reads a resource by skill URI", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.readResource("skill://landing-page/SKILL.md")).toMatchObject({
      uri: "skill://landing-page/SKILL.md",
      name: "landing-page/SKILL.md",
      mimeType: "text/markdown",
    });
  });

  it("searches indexed markdown content across capabilities", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.search("conversion")).toMatchObject([
      {
        capabilityId: "landing-page",
        path: "shared/rules.md",
        uri: "skill://landing-page/shared/rules.md",
      },
    ]);
  });
});
