export type CapabilityFileType =
  | "skill"
  | "agent"
  | "shared"
  | "reference"
  | "readme"
  | "bundle"
  | "asset"
  | "script"
  | "data"
  | "other";

/** Which layer of an imported capability a file comes from. */
export type CapabilityFileLayer = "local" | "upstream" | "override";

export interface CapabilityFile {
  capabilityId: string;
  path: string;
  uri: string;
  name: string;
  type: CapabilityFileType;
  mimeType: string;
  /**
   * Decoded UTF-8 content. Undefined for binary files: those are indexed by
   * metadata only and never decoded.
   */
  text?: string;
  /** Line count for text files, 0 for binary files. */
  lines: number;
  bytes: number;
  binary: boolean;
  /** Content identity for binary files, which carry no indexable text. */
  sha256?: string;
  layer?: CapabilityFileLayer;
}

/**
 * How a skill behaves once loaded. Detected at import time, best effort.
 *
 * - `portable`: SKILL.md (+ references) only, safe to load anywhere.
 * - `resource-dependent`: also ships data/ or assets/ it expects to read.
 * - `executable`: ships scripts. MCPIMP never runs them.
 * - `platform-specific`: depends on a host runtime (Claude Code plugin root, …).
 */
export type SkillKind = "portable" | "resource-dependent" | "executable" | "platform-specific";

/** What sync is allowed to do when the upstream revision moves. */
export type UpdatePolicy = "manual" | "review" | "auto";

export interface CapabilityLicense {
  spdxId?: string;
  name?: string;
  url?: string;
  /** Path of the notice kept alongside the imported content. */
  noticePath?: string;
}

export interface CapabilityRevision {
  /** `git-commit`, `etag`, `last-modified` or `content-hash`. */
  kind: string;
  value: string;
}

export interface CapabilityDiscoverySource {
  type: string;
  url: string;
  name?: string;
  /** State of the catalogue when it pointed at this content. */
  revision?: CapabilityRevision;
}

/**
 * Where an imported capability comes from, precise enough to re-fetch the exact
 * same bytes later. Never dropped, never guessed.
 */
export interface CapabilityOrigin {
  type: string;
  sourceId: string;
  repository?: string;
  path?: string;
  ref?: string;
  commit?: string;
  url?: string;
  revision?: CapabilityRevision;
  /** Hash of the selected file set, used to skip unchanged downloads. */
  contentHash?: string;
  license?: CapabilityLicense;
  discoverySource?: CapabilityDiscoverySource;
  skillKind?: SkillKind;
  skillTraits?: string[];
  update?: UpdatePolicy;
  lastSyncedAt?: string;
  /** Binary files present upstream that were indexed but not downloaded. */
  skippedAssets?: SkippedAsset[];
}

export interface SkippedAsset {
  path: string;
  bytes: number;
  reason: string;
  url?: string;
  sha?: string;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  rootPath?: string;
  files: CapabilityFile[];
  mcp?: CapabilityMcpConfig;
  /** Present only for capabilities imported from an external source. */
  origin?: CapabilityOrigin;
}

export interface CapabilityMcpConfig {
  type: "mcp";
  transport: "streamable-http";
  url: string;
  enabled?: boolean;
  headers?: Record<string, string>;
}

export interface CapabilityResource {
  uri: string;
  name: string;
  mimeType: string;
  description?: string;
}

export interface CapabilitySearchResult {
  capabilityId: string;
  capabilityName: string;
  path: string;
  uri: string;
  title: string;
  snippet: string;
  /** Relative lexical relevance; only comparable within one result set. */
  score: number;
  matchedTerms: string[];
}

export interface CapabilitySearchOptions {
  limit?: number;
  capabilityId?: string;
  maxPerCapability?: number;
}

export interface CapabilityRegistry {
  listCapabilities(): Capability[];
  getCapability(id: string): Capability | undefined;
  listUpstreamMcpServers(): CapabilityUpstreamMcp[];
  listResources(): CapabilityResource[];
  readResource(uri: string): CapabilityFile;
  search(query: string, options?: CapabilitySearchOptions): CapabilitySearchResult[];
}

export interface CapabilityUpstreamMcp {
  capabilityId: string;
  capabilityName: string;
  config: CapabilityMcpConfig;
}
