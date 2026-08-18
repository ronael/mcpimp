import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { capabilityIdFor, assertSafeSegment } from "../core/names";
import { parseFrontmatter } from "./frontmatter";
import { searchCapabilities } from "./search";
import { countLines, decodeTextContent, mimeTypeFor } from "./text";
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

const IGNORED_NAMES = new Set([".git", "node_modules", ".DS_Store"]);

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

  return {
    type: "mcp",
    transport: "streamable-http",
    url: parsed.url,
    enabled: parsed.enabled,
    headers: parsed.headers,
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
    const namespace = manifestShape?.namespace || location.namespace;
    const slug = manifestShape?.slug || location.slug;
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

    return {
      id,
      namespace,
      slug,
      name: frontmatter.name || id,
      description: frontmatter.description || "",
      tags: frontmatter.tags.length > 0 ? frontmatter.tags : undefined,
      components: detectComponents(files),
      rootPath: location.capabilityRoot,
      files,
      mcp: mcpFile?.text ? parseMcpConfig(mcpFile.text) : undefined,
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
    if (!file) throw new Error(`Resource not found: ${uri}`);
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
