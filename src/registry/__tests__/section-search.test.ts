import { describe, expect, it } from "vitest";
import { rankMarkdownSections } from "../section-search";

const MARKDOWN = `# Architecture

Document overview.

## Référence principale

Read the detailed architecture blueprint.

## Workflow

Refactor a TypeScript frontend with pure domain, ports, adapters and Zustand stores.

## Output

Return a target file tree and implementation plan.`;

describe("rankMarkdownSections", () => {
  it("excludes a document wrapper and ranks the smallest relevant section", () => {
    const results = rankMarkdownSections(
      MARKDOWN,
      "restructurer frontend TypeScript domaine pur ports adapters Zustand",
      2,
    );

    expect(results[0]).toMatchObject({
      heading: "Workflow",
      matchedTerms: expect.arrayContaining(["frontend", "typescript", "port", "adapter", "zustand"]),
    });
    expect(results.map((result) => result.heading)).not.toContain("Architecture");
    expect(results).toHaveLength(1);
  });

  it("returns a bounded document-order fallback when nothing matches", () => {
    expect(rankMarkdownSections(MARKDOWN, "quantum banana", 2)).toEqual([
      expect.objectContaining({ heading: "Référence principale", score: 0, matchedTerms: [] }),
      expect.objectContaining({ heading: "Workflow", score: 0, matchedTerms: [] }),
    ]);
  });
});
