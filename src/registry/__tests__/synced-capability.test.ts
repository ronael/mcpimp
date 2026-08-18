import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../filesystem";
import { parseFrontmatter } from "../frontmatter";

const capabilitiesRoot = resolve("test/fixtures/synced-capabilities");

describe("synced capability layout", () => {
  it("exposes a synced capability under the same skill:// namespace as a local one", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(capabilitiesRoot);

    expect(registry.listCapabilities().map((capability) => capability.id)).toContain("with-provenance");
    expect(registry.readResource("skill://with-provenance/SKILL.md").text).toContain("Upstream body");
  });

  it("carries the provenance manifest through as capability origin", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(capabilitiesRoot);

    expect(registry.getCapability("with-provenance")?.origin).toMatchObject({
      type: "github",
      sourceId: "demo-source",
      repository: "acme/demo-skills",
      path: "skills/demo",
      ref: "main",
      commit: "1111111111111111111111111111111111111111",
      license: { spdxId: "MIT" },
      update: "review",
    });
  });

  it("layers overrides on top of upstream files of the same path", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(capabilitiesRoot);
    const file = registry.readResource("skill://with-provenance/references/notes.md");

    expect(file.text).toContain("MCPIMP-specific guidance");
    expect(file.layer).toBe("override");
  });

  it("marks untouched upstream files as the upstream layer", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(capabilitiesRoot);

    expect(registry.readResource("skill://with-provenance/SKILL.md").layer).toBe("upstream");
  });

  it("does not leak SOURCE.json into the capability file list", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(capabilitiesRoot);

    expect(registry.getCapability("with-provenance")?.files.map((file) => file.path)).toEqual([
      "SKILL.md",
      "references/notes.md",
    ]);
  });
});

describe("parseFrontmatter", () => {
  it("reads name and description", () => {
    const parsed = parseFrontmatter("---\nname: demo\ndescription: A demo skill.\n---\n\n# Demo");

    expect(parsed).toMatchObject({ name: "demo", description: "A demo skill." });
  });

  it("reads inline and block tag lists", () => {
    expect(parseFrontmatter("---\nname: a\ntags: [ui, design]\n---\n").tags).toEqual(["ui", "design"]);
    expect(parseFrontmatter("---\nname: a\ntags:\n  - ui\n  - motion\n---\n").tags).toEqual(["ui", "motion"]);
  });

  it("strips surrounding quotes", () => {
    expect(parseFrontmatter('---\nname: "quoted"\n---\n').name).toBe("quoted");
  });

  it("returns empty metadata for content without frontmatter", () => {
    expect(parseFrontmatter("# No frontmatter here")).toMatchObject({ tags: [], fields: {} });
  });

  it("does not throw on malformed upstream frontmatter", () => {
    expect(() => parseFrontmatter("---\nthis is not: valid: yaml: at all\n[\n---\n")).not.toThrow();
  });
});
