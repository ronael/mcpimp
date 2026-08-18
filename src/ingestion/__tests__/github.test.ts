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

  it("discovers every SKILL.md in a multi-skill repository", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source();
    const skills = await adapter.discover(definition, await adapter.getRevision(definition));

    expect(skills.map((skill) => skill.capabilityId)).toEqual([
      "ui-baseline-ui",
      "ui-executable-one",
      "ui-improve-ui",
    ]);
  });

  it("pins provenance to the exact commit and path", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source();
    const skills = await adapter.discover(definition, await adapter.getRevision(definition));
    const improve = skills.find((skill) => skill.slug === "improve-ui");

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
    const skills = await adapter.discover(definition, await adapter.getRevision(definition));
    const improve = skills.find((skill) => skill.slug === "improve-ui");

    expect(improve?.files.map((file) => file.path)).toEqual(["SKILL.md", "references/plan.md"]);
    expect(improve?.skippedAssets).toMatchObject([{ path: "assets/preview.png", reason: "binary" }]);
  });

  it("classifies a skill that ships scripts as executable", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source();
    const skills = await adapter.discover(definition, await adapter.getRevision(definition));

    expect(skills.find((skill) => skill.slug === "executable-one")).toMatchObject({
      skillKind: "executable",
      skillTraits: ["scripts"],
    });
    expect(skills.find((skill) => skill.slug === "baseline-ui")).toMatchObject({ skillKind: "portable" });
  });

  it("honours include filters", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: MULTI_SKILL_FILES }]);

    const adapter = new GitHubSourceAdapter();
    const definition = source({ include: ["improve-ui"] });
    const skills = await adapter.discover(definition, await adapter.getRevision(definition));

    expect(skills.map((skill) => skill.slug)).toEqual(["improve-ui"]);
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
