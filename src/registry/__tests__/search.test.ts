import { describe, expect, it } from "vitest";
import { searchCapabilities, tokenize } from "../search";
import type { Capability, CapabilityFile } from "../types";

function file(capabilityId: string, path: string, text: string, type: CapabilityFile["type"]): CapabilityFile {
  return {
    capabilityId,
    path,
    uri: `skill://${capabilityId}/${path}`,
    name: `${capabilityId}/${path}`,
    type,
    mimeType: path.endsWith(".md") ? "text/markdown" : "text/plain",
    text,
    lines: text.split("\n").length,
    bytes: text.length,
    binary: false,
  };
}

function capability(id: string, namespace: string, slug: string, name: string, description: string, files: CapabilityFile[]): Capability {
  return {
    id,
    namespace,
    slug,
    name,
    description,
    components: {
      skill: files.some((f) => f.path === "SKILL.md"),
      mcp: files.some((f) => f.path === "mcp.json"),
    },
    files,
  };
}

const CAPABILITIES: Capability[] = [
  capability("landing-page", "local", "landing-page", "landing-page", "Concevoir des landing pages premium et orientées conversion.", [
    file("landing-page", "SKILL.md", "# Landing\n\nOrchestre la conception d'une page.", "skill"),
    file(
      "landing-page",
      "shared/design-principles.md",
      "# Direction artistique\n\nNarration visuelle pour des marques d'hôtellerie haut de gamme, imagerie forte.",
      "shared",
    ),
    file("landing-page", "BUNDLE.md", "Narration visuelle imagerie hôtellerie accessibilité motion tokens", "bundle"),
  ]),
  capability(
    "ui-skills-fixing-accessibility",
    "ui-skills",
    "fixing-accessibility",
    "fixing-accessibility",
    "Fix accessibility issues: contrast, focus order, labels.",
    [
      file(
        "ui-skills-fixing-accessibility",
        "SKILL.md",
        "# Accessibility\n\nCheck colour contrast ratios and keyboard focus.",
        "skill",
      ),
      file("ui-skills-fixing-accessibility", "LICENSE.md", "MIT License\n\nImported by MCPIMP from acme/x", "other"),
    ],
  ),
  capability(
    "ui-skills-motion",
    "ui-skills",
    "motion",
    "fixing-motion-performance",
    "Fix janky animation and motion performance.",
    [
      file("ui-skills-motion", "SKILL.md", "# Motion\n\nAvoid layout thrash during animation.", "skill"),
      file("ui-skills-motion", "scripts/measure.py", "# animation performance contrast motion", "script"),
    ],
  ),
];

function ids(query: string): string[] {
  return searchCapabilities(CAPABILITIES, query).map((hit) => `${hit.capabilityId}/${hit.path}`);
}

describe("tokenize", () => {
  it("lowercases, strips accents and drops stopwords", () => {
    expect(tokenize("La Direction Artistique  d'un HÔTEL")).toEqual(["direction", "artistique", "hotel"]);
  });

  it("folds simple plurals so query and content meet", () => {
    expect(tokenize("tokens")).toEqual(tokenize("token"));
  });
});

describe("searchCapabilities", () => {
  it("returns nothing for an empty query", () => {
    expect(searchCapabilities(CAPABILITIES, "   ")).toEqual([]);
  });

  it("ranks the capability whose subject matches first", () => {
    expect(ids("accessibility contrast")[0]).toBe("ui-skills-fixing-accessibility/SKILL.md");
    expect(ids("motion performance")[0]).toBe("ui-skills-motion/SKILL.md");
  });

  it("prefers a document matching every query term over one matching a single term", () => {
    const results = searchCapabilities(CAPABILITIES, "accessibility contrast");
    const top = results[0];
    const script = results.find((hit) => hit.path === "scripts/measure.py");

    expect(top.matchedTerms).toEqual(["accessibility", "contrast"]);
    if (script) expect(script.score).toBeLessThan(top.score);
  });

  it("bridges French content and an English query through synonym expansion", () => {
    const results = ids("photographic luxury hospitality");

    expect(results).toContain("landing-page/shared/design-principles.md");
  });

  it("keeps generated licence notices out of the results", () => {
    expect(ids("accessibility contrast")).not.toContain("ui-skills-fixing-accessibility/LICENSE.md");
  });

  it("ranks a bundle below the prose it concatenates", () => {
    const results = searchCapabilities(CAPABILITIES, "narration visuelle imagerie");
    const bundle = results.findIndex((hit) => hit.path === "BUNDLE.md");
    const prose = results.findIndex((hit) => hit.path === "shared/design-principles.md");

    expect(prose).toBeGreaterThanOrEqual(0);
    expect(bundle === -1 || prose < bundle).toBe(true);
  });

  it("scopes results to one capability when asked", () => {
    const results = searchCapabilities(CAPABILITIES, "contrast", { capabilityId: "ui-skills-motion" });

    expect(results.every((hit) => hit.capabilityId === "ui-skills-motion")).toBe(true);
  });

  it("honours the limit", () => {
    expect(searchCapabilities(CAPABILITIES, "motion accessibility narration", { limit: 2 })).toHaveLength(2);
  });

  it("caps how many files a single capability may contribute", () => {
    const noisy: Capability[] = [
      capability("noisy", "local", "noisy", "noisy", "", [
        ...Array.from({ length: 8 }, (_, index) =>
          file("noisy", `shared/note-${index}.md`, "contrast contrast contrast", "shared"),
        ),
      ]),
    ];

    expect(searchCapabilities(noisy, "contrast")).toHaveLength(3);
  });

  it("returns a snippet containing the matched terms", () => {
    const [top] = searchCapabilities(CAPABILITIES, "keyboard focus");

    expect(top.snippet).toContain("keyboard focus");
  });

  it("skips files that have no indexable text", () => {
    const withBinary: Capability[] = [
      capability("assets", "local", "assets", "assets", "", [
        {
          ...file("assets", "assets/logo.png", "", "asset"),
          text: undefined,
          binary: true,
        },
      ]),
    ];

    expect(searchCapabilities(withBinary, "logo")).toEqual([]);
  });
});
