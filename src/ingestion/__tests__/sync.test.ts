import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileSystemCapabilityRegistry } from "../../registry/filesystem";
import { syncSources } from "../sync";
import { capabilityIdFor, hashFileSet } from "../normalize";
import type {
  ContentSourceAdapter,
  DiscoveredCapability,
  DiscoveredFileRef,
  FetchedFile,
  GitHubSourceDefinition,
  SourceDefinitionBase,
  SourceRevision,
} from "../types";
import { installFakeGitHub } from "./fake-github";

const COMMIT = "a".repeat(40);
const NEXT_COMMIT = "b".repeat(40);

const FILES: Record<string, string | Uint8Array> = {
  LICENSE: "MIT License",
  "skills/improve-ui/SKILL.md":
    "---\nname: improve-ui\ndescription: Improve an existing interface.\n---\n\n# Improve UI\n\nBody.",
  "skills/improve-ui/references/plan.md": "# Plan\n\nOriginal plan.",
};

function githubSource(overrides: Partial<GitHubSourceDefinition> = {}): GitHubSourceDefinition {
  return {
    id: "acme",
    type: "github",
    repository: "acme/ui-skills",
    roots: ["skills"],
    namespace: "ui",
    update: "review",
    ...overrides,
  };
}

interface MemorySourceDefinition {
  id: string;
  type: "memory";
  namespace?: string;
  update?: "manual" | "review" | "auto";
}

interface MemoryCapabilitySpec {
  namespace: string;
  slug: string;
  files: Record<string, string>;
}

function memorySource(overrides: Partial<MemorySourceDefinition> = {}): SourceDefinitionBase {
  return {
    id: "memory",
    type: "memory",
    update: "review",
    ...overrides,
  };
}

function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

class MemoryCapabilityAdapter implements ContentSourceAdapter<any> {
  readonly type = "memory";
  fetchCount = 0;

  constructor(private specs: MemoryCapabilitySpec[], private revision = COMMIT) {}

  updateFile(slug: string, path: string, text: string, revision = NEXT_COMMIT): void {
    const spec = this.specs.find((item) => item.slug === slug);
    if (!spec) throw new Error(`Unknown memory capability: ${slug}`);
    spec.files[path] = text;
    this.revision = revision;
  }

  async getRevision(): Promise<SourceRevision> {
    return {
      kind: "content-hash",
      value: this.revision,
      fetchedAt: new Date().toISOString(),
    };
  }

  async discover(source: MemorySourceDefinition, revision: SourceRevision): Promise<DiscoveredCapability[]> {
    return this.specs.map((spec) => {
      const files = this.fileRefs(spec);
      const contentHash = hashFileSet(files);
      const namespace = source.namespace || spec.namespace;
      const capabilityId = capabilityIdFor(namespace, spec.slug);

      return {
        namespace,
        slug: spec.slug,
        capabilityId,
        components: {
          skill: files.some((file) => file.path === "SKILL.md"),
          mcp: files.some((file) => file.path === "mcp.json"),
        },
        files,
        contentHash,
        skippedAssets: [],
        origin: {
          type: "memory",
          sourceId: source.id,
          path: spec.slug,
          revision: { kind: revision.kind, value: revision.value },
          contentHash,
        },
      };
    });
  }

  async fetch(_source: MemorySourceDefinition, capability: DiscoveredCapability): Promise<FetchedFile[]> {
    this.fetchCount += 1;
    const spec = this.specs.find((item) => item.slug === capability.slug);
    if (!spec) throw new Error(`Unknown memory capability: ${capability.slug}`);
    return Object.entries(spec.files).map(([path, text]) => ({ path, bytes: bytesOf(text) }));
  }

  private fileRefs(spec: MemoryCapabilitySpec): DiscoveredFileRef[] {
    return Object.entries(spec.files)
      .map(([path, text]) => ({
        path,
        bytes: bytesOf(text).byteLength,
        binary: false,
        sha: `${this.revision}:${path}:${text}`,
        url: `memory://${spec.slug}/${path}`,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }
}

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "mcpimp-sync-"));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

async function run(
  sources: SourceDefinitionBase[],
  options: { apply?: boolean; targets?: string[]; contentAdapters?: ContentSourceAdapter[] } = {},
) {
  return syncSources({ root, sources, ...options });
}

describe("syncSources", () => {
  it("syncs a capability with SKILL.md only", async () => {
    const adapter = new MemoryCapabilityAdapter([
      {
        namespace: "mem",
        slug: "skill-only",
        files: {
          "SKILL.md": "---\nname: Skill Only\ndescription: Portable capability.\n---\n\n# Skill Only",
        },
      },
    ]);

    const report = await run([memorySource()], { apply: true, contentAdapters: [adapter] });

    expect(report.entries).toMatchObject([{ capabilityId: "mem-skill-only", status: "new", applied: true }]);

    const registry = await FileSystemCapabilityRegistry.scan(join(root, "catalog/capabilities"));
    expect(registry.getCapability("mem-skill-only")).toMatchObject({
      name: "Skill Only",
      components: { skill: true, mcp: false },
      origin: { type: "memory", sourceId: "memory" },
    });

    const manifest = JSON.parse(
      await readFile(join(root, "catalog/capabilities/mem/skill-only/SOURCE.json"), "utf-8"),
    );
    expect(manifest).toMatchObject({ capability: "mem-skill-only", skillKind: "portable" });
  });

  it("syncs an MCP-only capability without SKILL.md", async () => {
    const adapter = new MemoryCapabilityAdapter([
      {
        namespace: "mem",
        slug: "browser-mcp",
        files: {
          "mcp.json": JSON.stringify({
            type: "mcp",
            transport: "streamable-http",
            url: "http://127.0.0.1:3901/message",
            name: "Browser MCP",
            description: "Rendered browser inspection.",
            tags: ["browser", "inspection"],
          }),
        },
      },
    ]);

    const report = await run([memorySource()], { apply: true, contentAdapters: [adapter] });

    expect(report.entries).toMatchObject([{ capabilityId: "mem-browser-mcp", status: "new", applied: true }]);

    const registry = await FileSystemCapabilityRegistry.scan(join(root, "catalog/capabilities"));
    expect(registry.getCapability("mem-browser-mcp")).toMatchObject({
      name: "Browser MCP",
      description: "Rendered browser inspection.",
      components: { skill: false, mcp: true },
    });
    expect(registry.listUpstreamMcpServers()).toHaveLength(1);

    const manifest = JSON.parse(
      await readFile(join(root, "catalog/capabilities/mem/browser-mcp/SOURCE.json"), "utf-8"),
    );
    expect(manifest.skillKind).toBeUndefined();
    expect(manifest.skillTraits).toBeUndefined();
  });

  it("syncs a composite capability with SKILL.md and mcp.json", async () => {
    const adapter = new MemoryCapabilityAdapter([
      {
        namespace: "mem",
        slug: "composite",
        files: {
          "SKILL.md": "---\nname: Composite\ndescription: Skill plus MCP.\n---\n\n# Composite",
          "mcp.json": JSON.stringify({
            type: "mcp",
            transport: "streamable-http",
            url: "http://127.0.0.1:3901/message",
          }),
        },
      },
    ]);

    await run([memorySource()], { apply: true, contentAdapters: [adapter] });

    const registry = await FileSystemCapabilityRegistry.scan(join(root, "catalog/capabilities"));
    expect(registry.getCapability("mem-composite")).toMatchObject({
      name: "Composite",
      components: { skill: true, mcp: true },
      mcp: { url: "http://127.0.0.1:3901/message" },
    });
  });

  it("does not fetch an existing capability when contentHash is unchanged", async () => {
    const adapter = new MemoryCapabilityAdapter([
      {
        namespace: "mem",
        slug: "stable",
        files: {
          "mcp.json": JSON.stringify({
            type: "mcp",
            transport: "streamable-http",
            url: "http://127.0.0.1:3901/message",
          }),
        },
      },
    ]);
    await run([memorySource()], { apply: true, contentAdapters: [adapter] });

    const before = adapter.fetchCount;
    const report = await run([memorySource()], { apply: true, contentAdapters: [adapter] });

    expect(report.entries).toMatchObject([{ capabilityId: "mem-stable", status: "up-to-date", applied: false }]);
    expect(adapter.fetchCount).toBe(before);
  });

  it("detects an upstream contentHash change for a non-skill capability", async () => {
    const adapter = new MemoryCapabilityAdapter([
      {
        namespace: "mem",
        slug: "remote-tool",
        files: {
          "mcp.json": JSON.stringify({
            type: "mcp",
            transport: "streamable-http",
            url: "http://127.0.0.1:3901/message",
          }),
        },
      },
    ]);
    await run([memorySource()], { apply: true, contentAdapters: [adapter] });

    adapter.updateFile(
      "remote-tool",
      "mcp.json",
      JSON.stringify({
        type: "mcp",
        transport: "streamable-http",
        url: "http://127.0.0.1:3902/message",
      }),
    );

    const report = await run([memorySource()], { contentAdapters: [adapter] });

    expect(report.entries[0]).toMatchObject({
      capabilityId: "mem-remote-tool",
      status: "update-available",
      previousRevision: COMMIT,
      revision: NEXT_COMMIT,
      changes: { added: [], removed: [], modified: ["mcp.json"] },
    });
  });

  it("reports a first import as new and writes nothing without --apply", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);

    const report = await run([githubSource()]);

    expect(report.entries).toMatchObject([{ capabilityId: "ui-improve-ui", status: "new", applied: false }]);
    await expect(
      readFile(join(root, "catalog/capabilities/ui/improve-ui/SOURCE.json"), "utf-8"),
    ).rejects.toThrow();
  });

  it("writes upstream content and a provenance manifest on apply", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);

    const report = await run([githubSource()], { apply: true });
    expect(report.entries[0]).toMatchObject({ status: "new", applied: true });

    const manifest = JSON.parse(
      await readFile(join(root, "catalog/capabilities/ui/improve-ui/SOURCE.json"), "utf-8"),
    );
    expect(manifest).toMatchObject({
      capability: "ui-improve-ui",
      repository: "acme/ui-skills",
      path: "skills/improve-ui",
      ref: "main",
      commit: COMMIT,
      update: "review",
      license: { spdxId: "MIT" },
    });
    expect(manifest.lastSyncedAt).toEqual(expect.any(String));
    expect(manifest.files.map((file: { path: string }) => file.path)).toContain("references/plan.md");

    const skill = await readFile(join(root, "catalog/capabilities/ui/improve-ui/upstream/SKILL.md"), "utf-8");
    expect(skill).toContain("# Improve UI");
  });

  it("reports up-to-date and re-downloads nothing when the revision has not moved", async () => {
    const github = installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);
    await run([githubSource()], { apply: true });

    const before = github.requests.length;
    const report = await run([githubSource()], { apply: true });

    expect(report.entries).toMatchObject([{ status: "up-to-date", applied: false }]);
    expect(github.requests.slice(before).some((url) => url.startsWith("https://raw.githubusercontent.com"))).toBe(
      false,
    );
  });

  it("detects a changed skill and lists the changed files", async () => {
    const github = installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);
    await run([githubSource()], { apply: true });

    github.update("skills/improve-ui/references/plan.md", "# Plan\n\nRewritten.", NEXT_COMMIT);
    const report = await run([githubSource()]);

    expect(report.entries[0]).toMatchObject({
      status: "update-available",
      previousRevision: COMMIT,
      revision: NEXT_COMMIT,
      changes: { added: [], removed: [], modified: ["references/plan.md"] },
    });
  });

  it('holds back an update under the default "review" policy until it is named', async () => {
    const github = installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);
    await run([githubSource()], { apply: true });
    github.update("skills/improve-ui/references/plan.md", "# Plan\n\nRewritten.", NEXT_COMMIT);

    const blind = await run([githubSource()], { apply: true });
    expect(blind.entries[0]).toMatchObject({ status: "update-available", applied: false });
    expect(
      await readFile(join(root, "catalog/capabilities/ui/improve-ui/upstream/references/plan.md"), "utf-8"),
    ).toContain("Original plan");

    const targeted = await run([githubSource()], { apply: true, targets: ["ui-improve-ui"] });
    expect(targeted.entries[0]).toMatchObject({ applied: true });
    expect(
      await readFile(join(root, "catalog/capabilities/ui/improve-ui/upstream/references/plan.md"), "utf-8"),
    ).toContain("Rewritten");
  });

  it('applies an update without being named under the "auto" policy', async () => {
    const github = installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);
    await run([githubSource({ update: "auto" })], { apply: true });
    github.update("skills/improve-ui/references/plan.md", "# Plan\n\nRewritten.", NEXT_COMMIT);

    const report = await run([githubSource({ update: "auto" })], { apply: true });

    expect(report.entries[0]).toMatchObject({ status: "update-available", applied: true });
  });

  it("removes upstream files that disappeared, but keeps local overrides", async () => {
    const github = installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);
    await run([githubSource()], { apply: true });

    const overridePath = join(root, "catalog/capabilities/ui/improve-ui/overrides/mcpimp-notes.md");
    await writeFile(overridePath, "# MCPIMP notes\n\nLocal guidance.\n", "utf-8");

    github.remove("skills/improve-ui/references/plan.md", NEXT_COMMIT);
    await run([githubSource()], { apply: true, targets: ["ui-improve-ui"] });

    await expect(
      readFile(join(root, "catalog/capabilities/ui/improve-ui/upstream/references/plan.md"), "utf-8"),
    ).rejects.toThrow();
    expect(await readFile(overridePath, "utf-8")).toContain("Local guidance");
  });

  it("reports an unavailable source without aborting the run", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);

    const report = await run([githubSource({ id: "missing", repository: "acme/gone" }), githubSource()], {
      apply: true,
    });

    expect(report.entries.find((entry) => entry.sourceId === "missing")).toMatchObject({ status: "unavailable" });
    expect(report.entries.find((entry) => entry.capabilityId === "ui-improve-ui")).toMatchObject({ applied: true });
    expect(report.errors).toHaveLength(1);
  });

  it("produces capabilities the existing registry can serve unchanged", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);
    await run([githubSource()], { apply: true });

    const registry = await FileSystemCapabilityRegistry.scan(join(root, "catalog/capabilities"));
    const capability = registry.getCapability("ui-improve-ui");

    expect(capability).toMatchObject({
      id: "ui-improve-ui",
      name: "improve-ui",
      description: "Improve an existing interface.",
      origin: { repository: "acme/ui-skills", commit: COMMIT },
    });
    expect(registry.readResource("skill://ui-improve-ui/SKILL.md").text).toContain("# Improve UI");
    expect(registry.search("improve interface").map((hit) => hit.capabilityId)).toContain("ui-improve-ui");
  });

  it("lets an override shadow an upstream file of the same path", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);
    await run([githubSource()], { apply: true });

    await mkdir(join(root, "catalog/capabilities/ui/improve-ui/overrides/references"), { recursive: true });
    await writeFile(
      join(root, "catalog/capabilities/ui/improve-ui/overrides/references/plan.md"),
      "# Plan\n\nMCPIMP override.\n",
      "utf-8",
    );

    const registry = await FileSystemCapabilityRegistry.scan(join(root, "catalog/capabilities"));
    const file = registry.readResource("skill://ui-improve-ui/references/plan.md");

    expect(file.text).toContain("MCPIMP override");
    expect(file.layer).toBe("override");
  });

  it("refuses to overwrite a local capability that has no SOURCE.json", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);

    const localRoot = join(root, "catalog/capabilities/ui/improve-ui");
    await mkdir(localRoot, { recursive: true });
    await writeFile(
      join(localRoot, "SKILL.md"),
      "---\nname: improve-ui\ndescription: Local version.\n---\n\n# Local",
      "utf-8",
    );

    const report = await run([githubSource()], { apply: true });

    expect(report.entries[0]).toMatchObject({
      status: "unavailable",
      applied: false,
      reason: expect.stringContaining("exists locally without SOURCE.json"),
    });
    expect(await readFile(join(localRoot, "SKILL.md"), "utf-8")).toContain("# Local");
  });

  it("refuses to let one external source take over a capability owned by another", async () => {
    installFakeGitHub([
      { repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } },
      {
        repository: "evil/ui-skills",
        commit: NEXT_COMMIT,
        files: {
          "skills/improve-ui/SKILL.md":
            "---\nname: improve-ui\ndescription: Taken over.\n---\n\n# Taken over",
        },
      },
    ]);

    await run([githubSource()], { apply: true });
    const report = await run(
      [
        githubSource(),
        githubSource({ id: "evil", repository: "evil/ui-skills" }),
      ],
      { apply: true, targets: ["ui-improve-ui"] },
    );

    const evilEntry = report.entries.find((entry) => entry.sourceId === "evil");
    expect(evilEntry).toMatchObject({
      status: "unavailable",
      applied: false,
      reason: expect.stringContaining("owned by source \"acme\""),
    });

    const skill = await readFile(join(root, "catalog/capabilities/ui/improve-ui/upstream/SKILL.md"), "utf-8");
    expect(skill).toContain("# Improve UI");
  });

  it("rejects malicious namespace or slug segments before writing", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);

    const report = await run([githubSource({ namespace: "../etc", include: ["improve-ui"] })], { apply: true });

    expect(report.errors[0].message).toMatch(/Unsafe namespace/);
  });

  it("refuses to touch a capability whose manifest identity disagrees with its folder", async () => {
    installFakeGitHub([{ repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } }]);

    const target = join(root, "catalog/capabilities/ui/improve-ui");
    await mkdir(target, { recursive: true });
    await writeFile(
      join(target, "SOURCE.json"),
      JSON.stringify(
        {
          type: "github",
          sourceId: "acme",
          namespace: "ui",
          slug: "other-slug",
          capability: "ui-other-slug",
          update: "review",
          files: [],
        },
        null,
        2,
      ),
      "utf-8",
    );

    const report = await run([githubSource()], { apply: true, targets: ["ui-improve-ui"] });

    expect(report.entries[0]).toMatchObject({
      status: "unavailable",
      applied: false,
      reason: expect.stringContaining('SOURCE.json slug "other-slug" does not match folder "improve-ui"'),
    });
  });

  it("refuses an id already claimed by a capability at another filesystem location", async () => {
    installFakeGitHub([
      { repository: "acme/ui-skills", commit: COMMIT, files: { ...FILES } },
      {
        repository: "acme/evil",
        commit: NEXT_COMMIT,
        files: {
          "skills/ui-improve-ui/SKILL.md":
            "---\nname: ui-improve-ui\ndescription: Collides with ui/improve-ui.\n---\n\n# Collision",
        },
      },
    ]);

    // Source A owns `ui/improve-ui` -> public id `ui-improve-ui`.
    await run([githubSource()], { apply: true });

    // Source B tries a different physical path (`local/ui-improve-ui`) that
    // slugifies to the same public id. The path is free, but the id is not.
    const report = await run(
      [githubSource(), githubSource({ id: "evil", repository: "acme/evil", namespace: "local" })],
      { apply: true, targets: ["ui-improve-ui"] },
    );

    const evil = report.entries.find((entry) => entry.sourceId === "evil");
    expect(evil).toMatchObject({
      status: "unavailable",
      applied: false,
      reason: expect.stringContaining("is already owned at"),
    });
  });
});
