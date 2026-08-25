import { describe, expect, it } from "vitest";
import { extractReferenceLinks } from "../dashboard-helpers";
import type { CapabilityFile } from "../../registry/types";

function referenceFile(text: string): CapabilityFile {
  return {
    capabilityId: "ui-component-resources",
    path: "references/component-inspiration-links.md",
    uri: "skill://ui-component-resources/references/component-inspiration-links.md",
    name: "ui-component-resources/references/component-inspiration-links.md",
    type: "reference",
    mimeType: "text/markdown",
    text,
    lines: text.split("\n").length,
    bytes: Buffer.byteLength(text),
    binary: false,
  };
}

describe("dashboard helpers", () => {
  it("uses the list item label as the source name for bare reference URLs", () => {
    const links = extractReferenceLinks(
      referenceFile(`# Component Inspiration Links

## Component Galleries

- Beautiful UI: https://beautifului.dev/ - AI-native interface patterns.
- beUI: https://beui.dev/ - animated React components.
- Rare UI:
  https://rareui.com/
`),
    );

    expect(links.map((link) => link.title)).toEqual(["Beautiful UI", "beUI", "Rare UI"]);
  });
});
