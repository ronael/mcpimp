import { describe, expect, it } from "vitest";
import { extractLinkedCapabilityPaths } from "../markdown-links";

describe("extractLinkedCapabilityPaths", () => {
  const files = [
    "guides/start.md",
    "references/blueprint.md",
    "shared/rules.md",
  ];

  it("keeps known exact and relative internal paths in document order", () => {
    const markdown = [
      "Read [the rules](../shared/rules.md#validation) first.",
      "Then load `references/blueprint.md`.",
      "The blueprint may be mentioned again: references/blueprint.md.",
    ].join("\n");

    expect(extractLinkedCapabilityPaths(markdown, "guides/start.md", files)).toEqual([
      "shared/rules.md",
      "references/blueprint.md",
    ]);
  });

  it("ignores external, missing and current-file links", () => {
    const markdown = [
      "[external](https://example.com/reference.md)",
      "[missing](../references/missing.md)",
      "[self](start.md)",
    ].join("\n");

    expect(extractLinkedCapabilityPaths(markdown, "guides/start.md", files)).toEqual([]);
  });
});
