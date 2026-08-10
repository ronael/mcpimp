import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSourceDefinitions, parseSourceDefinition } from "../definitions";
import { assertSafeRelativePath, capabilityIdFor, classifySkill, hashFileSet } from "../normalize";
import { assertAllowedUrl, SourceUnavailableError } from "../http";

describe("parseSourceDefinition", () => {
  it("parses a GitHub source", () => {
    expect(
      parseSourceDefinition(
        { id: "acme", type: "github", repository: "acme/skills", roots: ["skills"] },
        "acme.json",
      ),
    ).toMatchObject({ id: "acme", type: "github", repository: "acme/skills", roots: ["skills"] });
  });

  it("parses a web catalogue source", () => {
    expect(
      parseSourceDefinition(
        { id: "cat", type: "web-catalog", url: "https://example.com/skills", allowedRepositories: ["a/b"] },
        "cat.json",
      ),
    ).toMatchObject({ type: "web-catalog", url: "https://example.com/skills", allowedRepositories: ["a/b"] });
  });

  it("rejects an unknown source type", () => {
    expect(() => parseSourceDefinition({ id: "x", type: "ftp" }, "x.json")).toThrow(/unknown source type/);
  });

  it("rejects a GitHub source without a repository", () => {
    expect(() => parseSourceDefinition({ id: "x", type: "github" }, "x.json")).toThrow(/"repository"/);
  });

  it("rejects an invalid update policy", () => {
    expect(() =>
      parseSourceDefinition({ id: "x", type: "github", repository: "a/b", update: "always" }, "x.json"),
    ).toThrow(/manual, review, auto/);
  });
});

describe("loadSourceDefinitions", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "mcpimp-sources-"));
    await writeFile(join(root, "placeholder"), "", "utf-8");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns an empty list when no sources folder exists", async () => {
    expect(await loadSourceDefinitions(root)).toEqual([]);
  });

  it("rejects a definition whose id does not match its filename", async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(root, "sources"), { recursive: true });
    await writeFile(
      join(root, "sources", "acme.json"),
      JSON.stringify({ id: "other", type: "github", repository: "a/b" }),
      "utf-8",
    );

    await expect(loadSourceDefinitions(root)).rejects.toThrow(/must match the filename/);
  });

  it("rejects malformed JSON with the offending file named", async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(root, "sources"), { recursive: true });
    await writeFile(join(root, "sources", "broken.json"), "{ not json", "utf-8");

    await expect(loadSourceDefinitions(root)).rejects.toThrow(/broken\.json: invalid JSON/);
  });
});

describe("path and URL safety", () => {
  it("rejects traversal, absolute and reserved upstream paths", () => {
    for (const path of ["../escape.md", "/etc/passwd", "a/../../b.md", "C:/x.md", "a\\b.md", ".git/config"]) {
      expect(() => assertSafeRelativePath(path)).toThrow(/Unsafe upstream path/);
    }
  });

  it("accepts a normal nested path", () => {
    expect(assertSafeRelativePath("references/plan-template.md")).toBe("references/plan-template.md");
  });

  it("refuses non-HTTPS and non-allowlisted hosts", () => {
    expect(() => assertAllowedUrl("http://api.github.com/x")).toThrow(SourceUnavailableError);
    expect(() => assertAllowedUrl("https://evil.example.com/x")).toThrow(/Host not allowed/);
    expect(assertAllowedUrl("https://raw.githubusercontent.com/a/b").hostname).toBe("raw.githubusercontent.com");
  });
});

describe("naming and hashing", () => {
  it("namespaces a capability id without duplicating the namespace", () => {
    expect(capabilityIdFor("ui-skills", "improve-ui")).toBe("ui-skills-improve-ui");
    expect(capabilityIdFor("ui-skills", "ui-skills-root")).toBe("ui-skills-root");
  });

  it("hashes a file set independently of ordering", () => {
    const a = [
      { path: "SKILL.md", bytes: 10, binary: false, sha: "aaa", url: "" },
      { path: "references/x.md", bytes: 5, binary: false, sha: "bbb", url: "" },
    ];

    expect(hashFileSet(a)).toBe(hashFileSet([...a].reverse()));
    expect(hashFileSet(a)).not.toBe(hashFileSet([{ ...a[0], sha: "ccc" }, a[1]]));
  });
});

describe("classifySkill", () => {
  const ref = (path: string, binary = false) => ({ path, binary });

  it("calls a SKILL.md with references portable", () => {
    expect(classifySkill([ref("SKILL.md"), ref("references/a.md")], "")).toMatchObject({ kind: "portable" });
  });

  it("calls a skill shipping data resource-dependent", () => {
    expect(classifySkill([ref("SKILL.md"), ref("data/rows.csv")], "")).toMatchObject({
      kind: "resource-dependent",
    });
  });

  it("calls a skill shipping scripts executable", () => {
    expect(classifySkill([ref("SKILL.md"), ref("scripts/run.py")], "")).toMatchObject({ kind: "executable" });
  });

  it("detects a platform dependency from the manifest text", () => {
    expect(classifySkill([ref("SKILL.md")], "Run ${CLAUDE_PLUGIN_ROOT}/bin/tool")).toMatchObject({
      kind: "platform-specific",
    });
  });

  it("records binaries as a trait", () => {
    expect(classifySkill([ref("SKILL.md"), ref("assets/logo.png", true)], "").traits).toContain("binaries");
  });
});
