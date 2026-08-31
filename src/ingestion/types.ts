import type {
  CapabilityComponents,
  CapabilityDiscoverySource,
  CapabilityLicense,
  CapabilityOrigin,
  SkillKind,
  UpdatePolicy,
} from "../registry/types";

/**
 * Ports for the ingestion layer.
 *
 * Two kinds of adapter, on purpose:
 *  - a *content* source can be fetched from (GitHub today);
 *  - a *discovery* source only tells you where content lives (a web catalogue),
 *    and delegates the actual import to a content source.
 *
 * Keeping them apart is what lets a catalogue like agent-design.com be recorded as
 * `discoverySource` while the bytes come from the original repository, instead of
 * scraping and duplicating the catalogue's HTML.
 */

export interface SourceDefinitionBase {
  /** Stable id; also the filename under `sources/`. */
  id: string;
  type: string;
  /** What sync may do when upstream moves. Defaults to `review`. */
  update?: UpdatePolicy;
  /** Prefix for generated capability ids. Defaults to a slug of the source. */
  namespace?: string;
  /** Capability slugs to import. Empty or absent means "everything discovered". */
  include?: string[];
  exclude?: string[];
  /** Files larger than this are skipped and recorded. Defaults to 512 KiB. */
  maxFileBytes?: number;
  /** Guard against pathological repositories. Defaults to 200. */
  maxFiles?: number;
  /** Binary assets are indexed as metadata unless this is true. */
  downloadBinaries?: boolean;
  notes?: string;
}

export interface GitHubSourceDefinition extends SourceDefinitionBase {
  type: "github";
  /** `owner/name`. */
  repository: string;
  /** Branch or tag. Defaults to the repository default branch. */
  ref?: string;
  /** Subtrees to scan for `SKILL.md`. Defaults to the whole tree. */
  roots?: string[];
}

export interface WebCatalogSourceDefinition extends SourceDefinitionBase {
  type: "web-catalog";
  url: string;
  /**
   * Repositories this catalogue is allowed to import from. Empty means
   * discovery-only: the catalogue reports what it found and imports nothing.
   */
  allowedRepositories?: string[];
  /** Applied to every delegated GitHub source. */
  roots?: string[];
}

export type SourceDefinition = GitHubSourceDefinition | WebCatalogSourceDefinition;

export interface SourceRevision {
  /** `git-commit`, `etag`, `last-modified` or `content-hash`. */
  kind: string;
  value: string;
  url?: string;
  fetchedAt: string;
}

/** One file belonging to a discovered capability, known before any download. */
export interface DiscoveredFileRef {
  /** Relative to the capability root. Always validated before use. */
  path: string;
  bytes: number;
  binary: boolean;
  /** Upstream content id (git blob sha), used for change detection. */
  sha?: string;
  url: string;
}

/**
 * Normalized unit produced by ingestion adapters.
 *
 * Adapters own discovery strategy. A GitHub skill source can still discover
 * roots through SKILL.md, while another adapter may announce MCP-only or
 * composite capabilities directly. The sync pipeline consumes this shape and
 * does not require any specific component to exist.
 */
export interface DiscoveredCapability {
  /** Namespace for grouping on disk, e.g. `ui-skills`. */
  namespace: string;
  /** Slug within the namespace, e.g. `improve-ui`. */
  slug: string;
  /** Public stable id, e.g. `ui-skills-improve-ui`. */
  capabilityId: string;
  /** Components the adapter detected or announced for this capability. */
  components: CapabilityComponents;
  files: DiscoveredFileRef[];
  /** Deterministic hash of the selected file set at this revision. */
  contentHash: string;
  /** Skill metadata is present only when the capability has SKILL.md. */
  skillKind?: SkillKind;
  skillTraits?: string[];
  license?: CapabilityLicense;
  /** Files present upstream but deliberately not downloaded. */
  skippedAssets: { path: string; bytes: number; reason: string; url?: string; sha?: string }[];
  origin: Omit<CapabilityOrigin, "lastSyncedAt">;
}

export interface FetchedFile {
  path: string;
  bytes: Uint8Array;
}

export interface ContentSourceAdapter<D extends SourceDefinitionBase = SourceDefinitionBase> {
  readonly type: string;
  /** Cheap call that identifies the current upstream state. */
  getRevision(source: D): Promise<SourceRevision>;
  discover(source: D, revision: SourceRevision): Promise<DiscoveredCapability[]>;
  /** Only called when the content actually changed. */
  fetch(source: D, capability: DiscoveredCapability): Promise<FetchedFile[]>;
}

/** A content source found through a catalogue. */
export interface DelegatedSource {
  discoverySource: CapabilityDiscoverySource;
  definition: SourceDefinition;
  /** True when the catalogue entry is outside `allowedRepositories`. */
  allowed: boolean;
}

export interface DiscoverySourceAdapter<D extends SourceDefinitionBase = SourceDefinitionBase> {
  readonly type: string;
  getRevision(source: D): Promise<SourceRevision>;
  discoverSources(source: D, revision?: SourceRevision): Promise<DelegatedSource[]>;
}

export function updatePolicyOf(source: SourceDefinitionBase): UpdatePolicy {
  return source.update || "review";
}
