import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../filesystem";
import { parseFrontmatter } from "../frontmatter";

const importedRoot = resolve("test/fixtures/imported-root");

describe("imported capability layout", () => {
  it("exposes an imported capability under the same skill:// namespace as a local one", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(importedRoot);

    expect(registry.listCapabilities().map((capability) => capability.id)).toEqual(["demo-imported"]);
    expect(registry.readResource("skill://demo-imported/SKILL.md").text).toContain("Upstream body");
  });

  it("carries the provenance manifest through as capability origin", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(importedRoot);

    expect(registry.getCapability("demo-imported")?.origin).toMatchObject({
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
    const registry = await FileSystemCapabilityRegistry.scan(importedRoot);
    const file = registry.readResource("skill://demo-imported/references/notes.md");

    expect(file.text).toContain("MCPIMP-specific guidance");
    expect(file.layer).toBe("override");
  });

  it("marks untouched upstream files as the upstream layer", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(importedRoot);

    expect(registry.readResource("skill://demo-imported/SKILL.md").layer).toBe("upstream");
  });

  it("does not leak SOURCE.json into the capability file list", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(importedRoot);

    expect(registry.getCapability("demo-imported")?.files.map((file) => file.path)).toEqual([
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
