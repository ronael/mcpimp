import { afterEach, describe, expect, it, vi } from "vitest";
import { WebCatalogSourceAdapter } from "../web-catalog";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WebCatalogSourceAdapter", () => {
  it("preserves an explicit namespace for delegated GitHub sources", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response('<a href="https://github.com/nextlevelbuilder/ui-ux-pro-max-skill">source</a>'),
      ),
    );

    const [delegated] = await new WebCatalogSourceAdapter().discoverSources({
      id: "agent-design",
      type: "web-catalog",
      url: "https://agent-design.com/skills",
      namespace: "ui-ux-pro-max",
      roots: [".claude/skills"],
      include: ["ui-ux-pro-max"],
      allowedRepositories: ["nextlevelbuilder/ui-ux-pro-max-skill"],
    });

    expect(delegated.allowed).toBe(true);
    expect(delegated.definition).toMatchObject({
      type: "github",
      repository: "nextlevelbuilder/ui-ux-pro-max-skill",
      namespace: "ui-ux-pro-max",
      roots: [".claude/skills"],
      include: ["ui-ux-pro-max"],
    });
  });
});
