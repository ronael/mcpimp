import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubSourceAdapter } from "../github";
import { SourceUnavailableError } from "../http";
import type { GitHubSourceDefinition } from "../types";
import { installFakeGitHub } from "./fake-github";

const COMMIT = "a".repeat(40);

const MULTI_SKILL_FILES = {
  "LICENSE": "MIT License",
  "README.md": "# ui-skills",
  "skills/baseline-ui/SKILL.md": "---\nname: baseline-ui\ndescription: Baseline UI rules.\n---\n\n# Baseline",
  "skills/improve-ui/SKILL.md": "---\nname: improve-ui\ndescription: Improve an existing UI.\n---\n\n# Improve",
  "skills/improve-ui/references/plan.md": "# Plan",
  "skills/improve-ui/assets/preview.png": new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]),
  "skills/executable-one/SKILL.md": "---\nname: executable-one\ndescription: Runs scripts.\n---\n\n# Exec",
  "skills/executable-one/scripts/build.py": "print('never executed by MCPIMP')",
  "docs/not-a-skill.md": "# Docs",
};

function source(overrides: Partial<GitHubSourceDefinition> = {}): GitHubSourceDefinition {
  return {
    id: "test-source",
    type: "github",
    repository: "acme/ui-skills",
    roots: ["skills"],
    namespace: "ui",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHubSourceAdapter", () => {
  it("resolves the ref to a commit sha as the recorded revision", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const revision = await new GitHubSourceAdapter().getRevision(source());

    expect(revision).toMatchObject({ kind: "git-commit", value: COMMIT });
  });

  it("discovers every SKILL.md in a multi-skill repository as skill-only capabilities", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source();
    const capabilities = await adapter.discover(definition, await adapter.getRevision(definition));

    expect(capabilities.map((capability) => capability.capabilityId)).toEqual([
      "ui-baseline-ui",
      "ui-executable-one",
      "ui-improve-ui",
    ]);
    expect(capabilities.map((capability) => capability.components)).toEqual([
      { skill: true, mcp: false },
      { skill: true, mcp: false },
      { skill: true, mcp: false },
    ]);
  });

  it("announces an mcp component when mcp.json belongs to the same capability root", async () => {
    installFakeGitHub([
      {
        repository: "acme/composite",
        commit: COMMIT,
        files: {
          "skills/composite/SKILL.md": "---\nname: composite\ndescription: skill + mcp\n---\n\n# Composite",
          "skills/composite/mcp.json": JSON.stringify({
            type: "mcp",
            transport: "streamable-http",
            url: "https://example.com/mcp",
          }),
        },
      },
    ]);

    const adapter = new GitHubSourceAdapter();
    const definition = source({ repository: "acme/composite" });
    const capabilities = await adapter.discover(definition, await adapter.getRevision(definition));

    expect(capabilities).toHaveLength(1);
    expect(capabilities[0]).toMatchObject({
      capabilityId: "ui-composite",
      components: { skill: true, mcp: true },
    });
    expect(capabilities[0].files.map((file) => file.path)).toEqual(["SKILL.md", "mcp.json"]);
  });

  it("pins provenance to the exact commit and path", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source();
    const capabilities = await adapter.discover(definition, await adapter.getRevision(definition));
    const improve = capabilities.find((capability) => capability.slug === "improve-ui");

    expect(improve?.origin).toMatchObject({
      type: "github",
      sourceId: "test-source",
      repository: "acme/ui-skills",
      path: "skills/improve-ui",
      ref: "main",
      commit: COMMIT,
      license: { spdxId: "MIT" },
    });
  });

  it("indexes binary assets as metadata instead of downloading them", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source();
    const capabilities = await adapter.discover(definition, await adapter.getRevision(definition));
    const improve = capabilities.find((capability) => capability.slug === "improve-ui");

    expect(improve?.files.map((file) => file.path)).toEqual(["SKILL.md", "references/plan.md"]);
    expect(improve?.skippedAssets).toMatchObject([{ path: "assets/preview.png", reason: "binary" }]);
  });

  it("classifies a skill that ships scripts as executable", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source();
    const capabilities = await adapter.discover(definition, await adapter.getRevision(definition));

    expect(capabilities.find((capability) => capability.slug === "executable-one")).toMatchObject({
      skillKind: "executable",
      skillTraits: ["scripts"],
    });
    expect(capabilities.find((capability) => capability.slug === "baseline-ui")).toMatchObject({ skillKind: "portable" });
  });

  it("honours include filters", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source({ include: ["improve-ui"] });
    const capabilities = await adapter.discover(definition, await adapter.getRevision(definition));

    expect(capabilities.map((capability) => capability.slug)).toEqual(["improve-ui"]);
  });

  it("gives a stable content hash that moves only when content moves", async () => {
    const github = installFakeGitHub([
      { repository: "acme/ui-skills", commit: COMMIT, files: { ...MULTI_SKILL_FILES } },
    ]);

    const adapter = new GitHubSourceAdapter();
    const definition = source({ include: ["improve-ui"] });

    const first = await adapter.discover(definition, await adapter.getRevision(definition));
    const second = await adapter.discover(definition, await adapter.getRevision(definition));
    expect(second[0].contentHash).toBe(first[0].contentHash);

    github.update("skills/improve-ui/references/plan.md", "# Plan v2", "b".repeat(40));
    const third = await new GitHubSourceAdapter().discover(
      definition,
      await new GitHubSourceAdapter().getRevision(definition),
    );

    expect(third[0].contentHash).not.toBe(first[0].contentHash);
  });

  it("reports an unreachable repository instead of throwing an opaque error", async () => {
    installFakeGitHub([{ repository: "acme/other", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    await expect(new GitHubSourceAdapter().getRevision(source())).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("rejects an invalid repository name before any request", async () => {
    installFakeGitHub([]);

    await expect(new GitHubSourceAdapter().getRevision(source({ repository: "not-a-repo" }))).rejects.toThrow(
      /Invalid GitHub repository/,
    );
  });

  it("refuses a truncated tree rather than importing a partial skill", async () => {
    installFakeGitHub([
      { repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES, truncated: true },
    ]);

    const adapter = new GitHubSourceAdapter();
    const definition = source();

    await expect(adapter.discover(definition, await adapter.getRevision(definition))).rejects.toThrow(/truncated/);
  });
});