import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { capabilityIdFor, assertSafeSegment, slugify } from "../core/names";
import { parseFrontmatter } from "./frontmatter";
import { searchCapabilities } from "./search";
import { countLines, decodeTextContent, mimeTypeFor } from "./text";
import { CapabilityResourceNotFoundError } from "./types";
import type {
  Capability,
  CapabilityComponents,
  CapabilityFile,
  CapabilityFileLayer,
  CapabilityFileType,
  CapabilityMcpConfig,
  CapabilityOrigin,
  CapabilityRegistry,
  CapabilityResource,
  CapabilitySearchOptions,
  CapabilitySearchResult,
  CapabilityUpstreamMcp,
} from "./types";

export const IGNORED_NAMES = new Set([".git", "node_modules", ".DS_Store"]);

/** Verbatim upstream content inside a synced capability. */
export const UPSTREAM_DIR = "upstream";
/** Local MCPIMP additions, never touched by sync. */
export const OVERRIDES_DIR = "overrides";
/** Provenance manifest written by the ingestion layer. */
export const SOURCE_MANIFEST = "SOURCE.json";

interface RawMcpConfig {
  type?: "mcp" | "mcp-remote";
  transport?: "streamable-http";
  url?: string;
  enabled?: boolean;
  headers?: Record<string, string>;
  name?: string;
  description?: string;
  tags?: string[];
}

interface DiscoveredFile {
  path: string;
  fullPath: string;
  layer: CapabilityFileLayer;
}

interface CapabilityLocation {
  namespace: string;
  slug: string;
  capabilityRoot: string;
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function detectFileType(path: string): CapabilityFileType {
  if (path === "SKILL.md") return "skill";
  if (path === "README.md") return "readme";
  if (path === "BUNDLE.md") return "bundle";
  if (path.startsWith("agents/")) return "agent";
  if (path.startsWith("shared/")) return "shared";
  if (path.startsWith("references/")) return "reference";
  if (path.startsWith("scripts/")) return "script";
  if (path.startsWith("assets/")) return "asset";
  if (path.startsWith("data/")) return "data";
  return "other";
}

function parseMcpConfig(text: string): CapabilityMcpConfig {
  const parsed = JSON.parse(text) as RawMcpConfig;
  if (parsed.type !== "mcp" && parsed.type !== "mcp-remote") {
    throw new Error('mcp.json requires type "mcp" or "mcp-remote"');
  }

  const transport = parsed.transport || (parsed.type === "mcp-remote" ? "streamable-http" : undefined);
  if (transport !== "streamable-http") {
    throw new Error('mcp.json only supports transport "streamable-http" in v1');
  }
  if (typeof parsed.url !== "string" || parsed.url.trim() === "") {
    throw new Error("mcp.json requires a non-empty url");
  }

  // Optional metadata gives an MCP-only capability its identity. These feed the
  // search index, so their shapes are validated rather than trusted: search
  // assumes tags is an array and name is searchable text.
  if (parsed.name !== undefined && typeof parsed.name !== "string") {
    throw new Error('mcp.json "name" must be a string when present');
  }
  if (parsed.description !== undefined && typeof parsed.description !== "string") {
    throw new Error('mcp.json "description" must be a string when present');
  }
  if (parsed.tags !== undefined && (!Array.isArray(parsed.tags) || parsed.tags.some((tag) => typeof tag !== "string"))) {
    throw new Error('mcp.json "tags" must be an array of strings when present');
  }

  const tags = parsed.tags && parsed.tags.length > 0 ? parsed.tags : undefined;

  return {
    type: "mcp",
    transport: "streamable-http",
    url: parsed.url,
    enabled: parsed.enabled,
    headers: parsed.headers,
    name: parsed.name,
    description: parsed.description,
    tags,
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith(".")) continue;

    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectLayer(root: string, layer: CapabilityFileLayer): Promise<DiscoveredFile[]> {
  const exists = await stat(root).catch(() => null);
  if (!exists?.isDirectory()) return [];

  return (await walkFiles(root)).map((fullPath) => ({
    path: normalizePath(relative(root, fullPath)),
    fullPath,
    layer,
  }));
}

/**
 * Reads one file into the index. Binary files are measured and hashed but never
 * decoded: an external skill may ship images, fonts or PDFs, and forcing UTF-8 on
 * those bytes corrupts the index and can throw.
 */
async function readCapabilityFile(capabilityId: string, discovered: DiscoveredFile): Promise<CapabilityFile> {
  const bytes = await readFile(discovered.fullPath);
  const text = decodeTextContent(discovered.path, bytes);
  const binary = text === undefined;

  return {
    capabilityId,
    path: discovered.path,
    uri: `skill://${capabilityId}/${discovered.path}`,
    name: `${capabilityId}/${discovered.path}`,
    type: detectFileType(discovered.path),
    mimeType: mimeTypeFor(discovered.path),
    text,
    lines: text === undefined ? 0 : countLines(text),
    bytes: bytes.byteLength,
    binary,
    sha256: binary ? createHash("sha256").update(bytes).digest("hex") : undefined,
    layer: discovered.layer,
  };
}

function sortCapabilityFiles(files: CapabilityFile[]): CapabilityFile[] {
  const priority = new Map([
    ["SKILL.md", 0],
    ["README.md", 1],
    ["BUNDLE.md", 2],
  ]);

  return files.sort((a, b) => {
    const aPriority = priority.get(a.path) ?? 10;
    const bPriority = priority.get(b.path) ?? 10;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.path.localeCompare(b.path);
  });
}

function detectComponents(files: CapabilityFile[]): CapabilityComponents {
  return {
    skill: files.some((file) => file.path === "SKILL.md"),
    mcp: files.some((file) => file.path === "mcp.json"),
  };
}

/**
 * Reads provenance from `SOURCE.json`, projecting it onto `CapabilityOrigin`.
 *
 * The manifest also carries sync bookkeeping (the per-file hash table) that the
 * MCP surface has no use for. Projecting explicitly keeps that out of tool
 * responses and out of the Worker snapshot.
 */
async function readOrigin(capabilityRoot: string): Promise<CapabilityOrigin | undefined> {
  const manifestPath = join(capabilityRoot, SOURCE_MANIFEST);
  const raw = await readFile(manifestPath, "utf-8").catch(() => undefined);
  if (raw === undefined) return undefined;

  let manifest: CapabilityOrigin;
  try {
    manifest = JSON.parse(raw) as CapabilityOrigin;
  } catch {
    throw new Error(`Invalid ${SOURCE_MANIFEST} in ${capabilityRoot}`);
  }

  return {
    type: manifest.type,
    sourceId: manifest.sourceId,
    repository: manifest.repository,
    path: manifest.path,
    ref: manifest.ref,
    commit: manifest.commit,
    url: manifest.url,
    revision: manifest.revision,
    contentHash: manifest.contentHash,
    license: manifest.license,
    discoverySource: manifest.discoverySource,
    skillKind: manifest.skillKind,
    skillTraits: manifest.skillTraits,
    update: manifest.update,
    lastSyncedAt: manifest.lastSyncedAt,
    skippedAssets: manifest.skippedAssets,
  };
}

interface SourceManifestShape {
  namespace?: string;
  slug?: string;
  capability?: string;
}

/**
 * The filesystem is the structural truth for a synced capability: the manifest
 * must declare the same namespace/slug (and a capability id derived from them),
 * or the on-disk state is corrupted. This stops SOURCE.json from silently
 * rebranding `ui-skills/foo` into a capability with identity `other/bar`.
 */
export function assertManifestIdentity(
  manifest: { namespace?: string; slug?: string; capability?: string },
  namespace: string,
  slug: string,
): void {
  if (manifest.namespace === undefined || manifest.slug === undefined || manifest.capability === undefined) {
    throw new Error(`SOURCE.json for ${namespace}/${slug} must declare "namespace", "slug" and "capability"`);
  }
  if (slugify(manifest.namespace) !== slugify(namespace)) {
    throw new Error(`SOURCE.json namespace "${manifest.namespace}" does not match folder "${namespace}"`);
  }
  if (slugify(manifest.slug) !== slugify(slug)) {
    throw new Error(`SOURCE.json slug "${manifest.slug}" does not match folder "${slug}"`);
  }
  const id = capabilityIdFor(namespace, slug);
  if (slugify(manifest.capability) !== id) {
    throw new Error(
      `SOURCE.json capability "${manifest.capability}" does not match ${namespace}/${slug} (expected "${id}")`,
    );
  }
}

async function readManifestShape(capabilityRoot: string): Promise<SourceManifestShape | undefined> {
  const manifestPath = join(capabilityRoot, SOURCE_MANIFEST);
  const raw = await readFile(manifestPath, "utf-8").catch(() => undefined);
  if (raw === undefined) return undefined;

  try {
    return JSON.parse(raw) as SourceManifestShape;
  } catch {
    throw new Error(`Invalid ${SOURCE_MANIFEST} in ${capabilityRoot}`);
  }
}

export class FileSystemCapabilityRegistry implements CapabilityRegistry {
  private constructor(private readonly capabilities: Capability[]) {}

  /**
   * Discovers capabilities under `root` in a namespace/slug layout:
   *
   *   catalog/capabilities/<namespace>/<slug>/
   *
   * A directory is a capability candidate if it contains at least one supported
   * component file (today: SKILL.md or mcp.json). The presence of `SOURCE.json`
   * selects the synced layout, where the effective file set is built from
   * `upstream/` overlaid by `overrides/`. Without `SOURCE.json` the directory is
   * treated as a local capability and read directly.
   *
   * Public capability ids remain stable regardless of the on-disk path: a synced
   * capability with namespace `ui-skills` and slug `improve-ui` is exposed as
   * `ui-skills-improve-ui`; a local capability is exposed by its slug alone.
   */
  static async scan(root: string): Promise<FileSystemCapabilityRegistry> {
    const capabilities: Capability[] = [];

    for (const location of await this.readCapabilityLocations(root)) {
      const hasManifest = await stat(join(location.capabilityRoot, SOURCE_MANIFEST))
        .then((s) => s.isFile())
        .catch(() => false);

      let layers: { dir: string; layer: CapabilityFileLayer }[];
      if (hasManifest) {
        layers = [
          { dir: join(location.capabilityRoot, UPSTREAM_DIR), layer: "upstream" },
          { dir: join(location.capabilityRoot, OVERRIDES_DIR), layer: "override" },
        ];
      } else {
        layers = [{ dir: location.capabilityRoot, layer: "local" }];
      }

      const capability = await this.readCapability(location, layers);
      if (!capability.components.skill && !capability.components.mcp) continue;
      capabilities.push(capability);
    }

    // Two folders can map to the same public id after slugification (e.g.
    // `ui.skills/foo` and `ui-skills/foo`, or `local/ui-skills-foo` and
    // `ui-skills/foo`). A stable registry must never expose a duplicate id,
    // because getCapability/skill:// URIs/search/tools resolve by id.
    const claimed = new Map<string, string>();
    for (const capability of capabilities) {
      const first = claimed.get(capability.id);
      if (first !== undefined) {
        throw new Error(
          `Duplicate capability id "${capability.id}" at ${first} and ${capability.rootPath}; refusing to start with ambiguous ids`,
        );
      }
      // In scan() rootPath is always set by readCapability; the fallback keeps
      // the invariant meaningful for any future caller that omits it.
      claimed.set(capability.id, capability.rootPath ?? capability.id);
    }

    return new FileSystemCapabilityRegistry(
      capabilities.sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  static fromSnapshot(capabilities: Capability[]): FileSystemCapabilityRegistry {
    return new FileSystemCapabilityRegistry(capabilities);
  }

  private static async readCapabilityLocations(root: string): Promise<CapabilityLocation[]> {
    const locations: CapabilityLocation[] = [];
    const namespaceEntries = await readdir(root, { withFileTypes: true }).catch(() => []);

    for (const namespaceEntry of namespaceEntries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!namespaceEntry.isDirectory() || IGNORED_NAMES.has(namespaceEntry.name) || namespaceEntry.name.startsWith(".")) {
        continue;
      }

      const namespace = assertSafeSegment(namespaceEntry.name, "namespace");
      const namespaceRoot = join(root, namespaceEntry.name);
      const slugEntries = await readdir(namespaceRoot, { withFileTypes: true }).catch(() => []);

      for (const slugEntry of slugEntries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!slugEntry.isDirectory() || IGNORED_NAMES.has(slugEntry.name) || slugEntry.name.startsWith(".")) {
          continue;
        }

        const slug = assertSafeSegment(slugEntry.name, "slug");
        locations.push({
          namespace,
          slug,
          capabilityRoot: join(namespaceRoot, slugEntry.name),
        });
      }
    }

    return locations;
  }

  private static async readCapability(
    location: CapabilityLocation,
    layers: { dir: string; layer: CapabilityFileLayer }[],
  ): Promise<Capability> {
    const manifestShape = await readManifestShape(location.capabilityRoot);
    if (manifestShape) {
      assertManifestIdentity(manifestShape, location.namespace, location.slug);
    }
    const namespace = location.namespace;
    const slug = location.slug;
    const id = capabilityIdFor(namespace, slug);

    const byPath = new Map<string, DiscoveredFile>();
    for (const { dir, layer } of layers) {
      for (const discovered of await collectLayer(dir, layer)) {
        byPath.set(discovered.path, discovered);
      }
    }

    const files = sortCapabilityFiles(
      await Promise.all([...byPath.values()].map((discovered) => readCapabilityFile(id, discovered))),
    );

    const skill = files.find((file) => file.path === "SKILL.md");
    const frontmatter = parseFrontmatter(skill?.text || "");
    const mcpFile = files.find((file) => file.path === "mcp.json");
    const mcp = mcpFile?.text ? parseMcpConfig(mcpFile.text) : undefined;

    // Without SKILL.md a capability (MCP-only) still carries a real identity:
    // optional name/description/tags on mcp.json fill the metadata gap.
    const name = frontmatter.name || mcp?.name || id;
    const tags = frontmatter.tags.length > 0 ? frontmatter.tags : mcp?.tags;

    return {
      id,
      namespace,
      slug,
      name,
      description: frontmatter.description || mcp?.description || "",
      tags: tags && tags.length > 0 ? tags : undefined,
      components: detectComponents(files),
      rootPath: location.capabilityRoot,
      files,
      mcp,
      origin: await readOrigin(location.capabilityRoot),
    };
  }

  listCapabilities(): Capability[] {
    return this.capabilities.map((capability) => ({
      ...capability,
      files: [...capability.files],
    }));
  }

  getCapability(id: string): Capability | undefined {
    const capability = this.capabilities.find((item) => item.id === id);
    if (!capability) return undefined;
    return { ...capability, files: [...capability.files] };
  }

  listUpstreamMcpServers(): CapabilityUpstreamMcp[] {
    return this.capabilities
      .filter((capability) => capability.mcp)
      .map((capability) => ({
        capabilityId: capability.id,
        capabilityName: capability.name,
        config: capability.mcp!,
      }));
  }

  listResources(): CapabilityResource[] {
    return this.capabilities.flatMap((capability) =>
      capability.files
        .filter((file) => !file.binary)
        .map((file) => ({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          description: `${capability.name}: ${file.path}`,
        })),
    );
  }

  readResource(uri: string): CapabilityFile {
    const file = this.capabilities.flatMap((capability) => capability.files).find((item) => item.uri === uri);
    if (!file) throw new CapabilityResourceNotFoundError(uri);
    if (file.binary) {
      throw new Error(
        `Binary resource is not readable as text: ${uri} (${file.bytes} bytes, ${file.mimeType}, sha256 ${file.sha256})`,
      );
    }
    return file;
  }

  search(query: string, options?: CapabilitySearchOptions): CapabilitySearchResult[] {
    return searchCapabilities(this.capabilities, query, options);
  }
}
