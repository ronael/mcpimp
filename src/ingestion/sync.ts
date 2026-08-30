import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { CAPABILITIES_DIR } from "../core/paths";
import {
  IGNORED_NAMES,
  OVERRIDES_DIR,
  SOURCE_MANIFEST,
  UPSTREAM_DIR,
  assertManifestIdentity,
} from "../registry/filesystem";
import type { CapabilityDiscoverySource, CapabilityOrigin, UpdatePolicy } from "../registry/types";
import { GitHubSourceAdapter } from "./github";
import { assertSafeSegment, capabilityIdFor } from "../core/names";
import { assertSafeRelativePath, classifySkill, sha256 } from "./normalize";
import {
  updatePolicyOf,
  type ContentSourceAdapter,
  type DiscoveredCapability,
  type SourceDefinition,
  type SourceDefinitionBase,
  type SourceRevision,
} from "./types";
import { WebCatalogSourceAdapter } from "./web-catalog";

export type SyncStatus =
  | "new"
  | "up-to-date"
  | "update-available"
  | "removed-upstream"
  | "renamed-upstream"
  | "unavailable";

export interface OverrideConflict {
  path: string;
  status: "identical" | "diverged";
}

export interface SyncFileRecord {
  path: string;
  bytes: number;
  binary: boolean;
  /** Upstream content id (git blob sha). */
  sha?: string;
  /** sha256 of the bytes actually written locally. */
  sha256?: string;
}

/** `SOURCE.json`: provenance plus the exact file set of the synced revision. */
export interface SourceManifest extends CapabilityOrigin {
  capability: string;
  namespace: string;
  slug: string;
  files: SyncFileRecord[];
}

export interface SyncEntry {
  capabilityId: string;
  sourceId: string;
  status: SyncStatus;
  applied: boolean;
  policy: UpdatePolicy;
  revision?: string;
  previousRevision?: string;
  replacementCapabilityId?: string;
  changes?: { added: string[]; removed: string[]; modified: string[] };
  overrideConflicts?: OverrideConflict[];
  reason?: string;
}

export interface SyncReport {
  entries: SyncEntry[];
  sourceChecks: {
    sourceId: string;
    sourceType: string;
    status: "success" | "error";
    revision?: string;
    checkedAt: string;
  }[];
  /** Repositories a catalogue exposed but that are not allowed for import. */
  catalogCandidates: { sourceId: string; repository: string; url: string }[];
  /** Catalogue repositories already owned by another declared source. */
  duplicateSources: { sourceId: string; repository: string; coveredBy: string }[];
  errors: { sourceId: string; message: string }[];
}

export interface SyncOptions {
  root: string;
  sources: SourceDefinitionBase[];
  /** Without this, sync only reports: nothing is ever written. */
  apply?: boolean;
  /** Source ids or capability ids explicitly named on the command line. */
  targets?: string[];
  /** Test/extension seam. Defaults to the GitHub adapter. */
  contentAdapters?: ContentSourceAdapter[];
}

function capabilitiesRoot(root: string): string {
  return join(root, CAPABILITIES_DIR);
}

function capabilityRootFor(root: string, namespace: string, slug: string): string {
  const safeNamespace = assertSafeSegment(namespace, "namespace");
  const safeSlug = assertSafeSegment(slug, "slug");
  return join(capabilitiesRoot(root), safeNamespace, safeSlug);
}

/** Every write path is re-checked against the capabilities root before it is used. */
function assertInsideCapabilities(root: string, candidate: string): string {
  const base = resolve(capabilitiesRoot(root));
  const target = resolve(candidate);

  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error(`Refusing to write outside ${CAPABILITIES_DIR}/: ${candidate}`);
  }

  return target;
}

async function readManifest(root: string, namespace: string, slug: string): Promise<SourceManifest | undefined> {
  const path = join(capabilityRootFor(root, namespace, slug), SOURCE_MANIFEST);
  const raw = await readFile(path, "utf-8").catch(() => undefined);
  if (raw === undefined) return undefined;

  try {
    return JSON.parse(raw) as SourceManifest;
  } catch {
    throw new Error(`Invalid ${SOURCE_MANIFEST} for ${namespace}/${slug}`);
  }
}

async function scanManagedCapabilities(root: string): Promise<SourceManifest[]> {
  const base = capabilitiesRoot(root);
  const manifests: SourceManifest[] = [];
  const namespaces = await readdir(base, { withFileTypes: true }).catch(() => []);

  for (const namespaceEntry of namespaces) {
    if (!namespaceEntry.isDirectory() || IGNORED_NAMES.has(namespaceEntry.name) || namespaceEntry.name.startsWith(".")) {
      continue;
    }
    const namespace = assertSafeSegment(namespaceEntry.name, "namespace");
    const slugs = await readdir(join(base, namespace), { withFileTypes: true }).catch(() => []);

    for (const slugEntry of slugs) {
      if (!slugEntry.isDirectory() || IGNORED_NAMES.has(slugEntry.name) || slugEntry.name.startsWith(".")) continue;
      const slug = assertSafeSegment(slugEntry.name, "slug");
      const manifest = await readManifest(root, namespace, slug).catch(() => undefined);
      if (!manifest) continue;
      try {
        assertManifestIdentity(manifest, namespace, slug);
      } catch {
        // Discovery for the same path will surface the precise ownership error.
        // A malformed manifest must not abort reporting for every other capability.
        continue;
      }
      manifests.push(manifest);
    }
  }

  return manifests.sort((a, b) => a.capability.localeCompare(b.capability));
}

function originIdentity(origin: Pick<CapabilityOrigin, "type" | "repository" | "path" | "url">): string | undefined {
  if (!origin.path) return undefined;
  return [origin.type, origin.repository || origin.url || "", origin.path].join(":");
}

async function overrideConflicts(
  root: string,
  namespace: string,
  slug: string,
  manifest: SourceManifest | undefined,
): Promise<OverrideConflict[] | undefined> {
  if (!manifest) return undefined;
  const overrideRoot = join(capabilityRootFor(root, namespace, slug), OVERRIDES_DIR);
  const upstreamByPath = new Map((manifest.files || []).map((file) => [file.path, file]));
  const conflicts: OverrideConflict[] = [];

  async function visit(directory: string, prefix = ""): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith(".")) continue;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await visit(join(directory, entry.name), relativePath);
        continue;
      }
      if (!entry.isFile()) continue;

      const upstream = upstreamByPath.get(relativePath);
      if (!upstream) continue;
      const bytes = await readFile(join(directory, entry.name));
      conflicts.push({
        path: relativePath,
        status: upstream.sha256 && upstream.sha256 === sha256(bytes) ? "identical" : "diverged",
      });
    }
  }

  await visit(overrideRoot);
  return conflicts.length > 0 ? conflicts : undefined;
}

/** A directory is a capability candidate when it carries a supported component. */
async function isCapabilityCandidate(dir: string): Promise<boolean> {
  for (const name of ["SKILL.md", "mcp.json", SOURCE_MANIFEST]) {
    const entry = await stat(join(dir, name)).catch(() => null);
    if (entry?.isFile()) return true;
  }
  return false;
}

/**
 * Slugification lets several filesystem locations produce the same public id
 * (e.g. `ui.skills/foo` and `ui-skills/foo`, or `local/ui-skills-foo` and
 * `ui-skills/foo`). Ownership by path is not enough: the public id is global.
 * Returns the first other location that already claims `capabilityId`, or the
 * location we are about to write (`namespace`/`slug`) when it already exists.
 */
async function claimedById(
  root: string,
  capabilityId: string,
  namespace: string,
  slug: string,
): Promise<string | undefined> {
  const base = capabilitiesRoot(root);
  const namespaceEntries = await readdir(base, { withFileTypes: true }).catch(() => []);

  for (const namespaceEntry of namespaceEntries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!namespaceEntry.isDirectory() || IGNORED_NAMES.has(namespaceEntry.name) || namespaceEntry.name.startsWith(".")) {
      continue;
    }

    const otherNamespace = assertSafeSegment(namespaceEntry.name, "namespace");
    const slugEntries = await readdir(join(base, namespaceEntry.name), { withFileTypes: true }).catch(() => []);

    for (const slugEntry of slugEntries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!slugEntry.isDirectory() || IGNORED_NAMES.has(slugEntry.name) || slugEntry.name.startsWith(".")) {
        continue;
      }

      const otherSlug = assertSafeSegment(slugEntry.name, "slug");
      if (otherNamespace === namespace && otherSlug === slug) continue;

      if (!(await isCapabilityCandidate(join(base, namespaceEntry.name, slugEntry.name)))) continue;
      if (capabilityIdFor(otherNamespace, otherSlug) !== capabilityId) continue;

      return join(base, namespaceEntry.name, slugEntry.name);
    }
  }

  return undefined;
}

/**
 * Ownership rule for sync writes:
 * - missing target directory => external source may create it;
 * - target exists with a valid SOURCE.json belonging to the same source/capability
 *   => managed by sync, update allowed;
 * - target exists without SOURCE.json => local capability, refuse to overwrite;
 * - target exists with a SOURCE.json owned by another source/capability
 *   => explicit collision, refuse to overwrite;
 * - anything else => explicit error, never silent overwrite.
 */
async function checkOwnership(
  root: string,
  sourceId: string,
  namespace: string,
  slug: string,
  capabilityId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const capabilityRoot = capabilityRootFor(root, namespace, slug);

  // The public id is global. Even with the target path free, another location
  // may already map to the same id after slugification: refuse to mint a second
  // physical location for an id that already exists.
  const claimedAt = await claimedById(root, capabilityId, namespace, slug);
  if (claimedAt) {
    return {
      ok: false,
      reason: `capability id "${capabilityId}" is already owned at ${claimedAt}; refusing a second location for the same id`,
    };
  }

  const exists = await stat(capabilityRoot).catch(() => null);
  if (!exists) return { ok: true };

  const manifestStat = await stat(join(capabilityRoot, SOURCE_MANIFEST)).catch(() => null);
  if (!manifestStat?.isFile()) {
    return {
      ok: false,
      reason: `capability "${capabilityId}" exists locally without ${SOURCE_MANIFEST}; refusing external overwrite`,
    };
  }

  const manifest = await readManifest(root, namespace, slug);
  if (!manifest) {
    return {
      ok: false,
      reason: `capability "${capabilityId}" has an unreadable ${SOURCE_MANIFEST}; refusing external overwrite`,
    };
  }

  // The manifest must identify exactly the filesystem location it lives in
  // (namespace/slug/capability). A manipulated manifest cannot rebrand a folder
  // to let another source silently take over a capability.
  try {
    assertManifestIdentity(manifest, namespace, slug);
  } catch (error) {
    return {
      ok: false,
      reason: `capability "${capabilityId}" ${error instanceof Error ? error.message : "has an inconsistent manifest"}; refusing external overwrite`,
    };
  }

  if (manifest.sourceId !== sourceId || manifest.capability !== capabilityId) {
    return {
      ok: false,
      reason: `capability "${capabilityId}" is owned by source "${manifest.sourceId}" (${manifest.capability}); refusing takeover by "${sourceId}"`,
    };
  }

  return { ok: true };
}

function diffFiles(previous: SyncFileRecord[] | undefined, next: DiscoveredCapability["files"]) {
  const before = new Map((previous || []).map((file) => [file.path, file.sha || String(file.bytes)]));
  const after = new Map(next.map((file) => [file.path, file.sha || String(file.bytes)]));

  const added = [...after.keys()].filter((path) => !before.has(path)).sort();
  const removed = [...before.keys()].filter((path) => !after.has(path)).sort();
  const modified = [...after.entries()]
    .filter(([path, id]) => before.has(path) && before.get(path) !== id)
    .map(([path]) => path)
    .sort();

  return { added, removed, modified };
}

/**
 * Decides whether a detected change may be written.
 *
 * A first import is a deliberate act (the source was just registered), so it
 * applies. An update to an existing capability only applies silently under
 * `auto`; `review` and `manual` require the capability or its source to be named
 * explicitly, so an upstream edit can never change MCPIMP's behaviour on its own.
 */
function mayWrite(status: SyncStatus, policy: UpdatePolicy, targeted: boolean): boolean {
  if (status === "new") return true;
  if (status !== "update-available") return false;
  if (policy === "auto") return true;
  return targeted;
}

export async function writeCapability(
  root: string,
  capability: DiscoveredCapability,
  files: { path: string; bytes: Uint8Array }[],
  manifest: SourceManifest,
): Promise<void> {
  const capabilityRoot = assertInsideCapabilities(
    root,
    capabilityRootFor(root, capability.namespace, capability.slug),
  );
  const upstreamDir = assertInsideCapabilities(root, join(capabilityRoot, UPSTREAM_DIR));
  const stagingDir = assertInsideCapabilities(root, `${upstreamDir}.staging`);

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  for (const file of files) {
    const target = assertInsideCapabilities(root, join(stagingDir, assertSafeRelativePath(file.path)));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.bytes);
  }

  // Keep the licence notice with the content it covers, unless upstream ships one.
  const hasNotice = files.some((file) => /^LICEN[CS]E(\.[a-z]+)?$/i.test(file.path));
  if (!hasNotice && manifest.license?.spdxId) {
    const notice = [
      `${manifest.license.name || manifest.license.spdxId}`,
      "",
      `Imported by MCPIMP from ${manifest.repository || manifest.url}`,
      `Path: ${manifest.path || "."}`,
      `Revision: ${manifest.commit || manifest.revision?.value || "unknown"}`,
      manifest.license.url ? `Licence: ${manifest.license.url}` : "",
      "",
      "This copy keeps the upstream licence. Check the source repository for the full text.",
      "",
    ].join("\n");

    await writeFile(join(stagingDir, "LICENSE.md"), notice, "utf-8");
    manifest.license.noticePath = "LICENSE.md";
  }

  await rm(upstreamDir, { recursive: true, force: true });
  await rename(stagingDir, upstreamDir);

  // Created once so local additions have an obvious home; sync never touches it.
  await mkdir(join(capabilityRoot, OVERRIDES_DIR), { recursive: true });

  await writeFile(
    join(capabilityRoot, SOURCE_MANIFEST),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf-8",
  );
}

export function buildManifest(
  capability: DiscoveredCapability,
  policy: UpdatePolicy,
  discoverySource: CapabilityDiscoverySource | undefined,
  files: { path: string; bytes: Uint8Array }[],
): SourceManifest {
  const written = new Map(files.map((file) => [file.path, file.bytes]));

  // Discovery classifies from paths only. Now that the content is here, refine
  // it when the capability actually has a skill component: only SKILL.md text can
  // reveal a platform dependency such as a plugin root. MCP-only capabilities do
  // not get skill metadata.
  const skillBytes = written.get("SKILL.md");
  const hasSkill = capability.components.skill || skillBytes !== undefined;
  const classification = hasSkill
    ? classifySkill(
        [...capability.files, ...capability.skippedAssets.map((asset) => ({ path: asset.path, binary: true }))],
        skillBytes ? new TextDecoder("utf-8").decode(skillBytes) : "",
      )
    : undefined;

  return {
    ...capability.origin,
    capability: capability.capabilityId,
    namespace: capability.namespace,
    slug: capability.slug,
    discoverySource,
    skillKind: classification?.kind,
    skillTraits: classification?.traits,
    update: policy,
    lastSyncedAt: new Date().toISOString(),
    files: capability.files.map((file) => ({
      path: file.path,
      bytes: file.bytes,
      binary: file.binary,
      sha: file.sha,
      sha256: written.has(file.path) ? sha256(written.get(file.path)!) : undefined,
    })),
  };
}

interface SourceRun {
  definition: SourceDefinitionBase;
  discoverySource?: CapabilityDiscoverySource;
}

/**
 * Reports, and optionally applies, the state of every registered source.
 *
 * Discovery is always cheap: one revision call plus one tree call per repository.
 * Files are downloaded only when the per-capability content hash actually moved,
 * so an unchanged capability costs no bandwidth and is never rewritten.
 */
export async function syncSources(options: SyncOptions): Promise<SyncReport> {
  const { root, sources, apply = false, targets = [] } = options;
  const contentAdapters = [new GitHubSourceAdapter(), ...(options.contentAdapters || [])];
  const adaptersByType = new Map(contentAdapters.map((adapter) => [adapter.type, adapter]));
  const catalog = new WebCatalogSourceAdapter();

  const report: SyncReport = { entries: [], sourceChecks: [], catalogCandidates: [], duplicateSources: [], errors: [] };
  const runs: SourceRun[] = [];
  const managed = await scanManagedCapabilities(root);
  const managedBySource = new Map<string, SourceManifest[]>();
  const managedByCatalog = new Map<string, SourceManifest[]>();
  for (const manifest of managed) {
    const manifests = managedBySource.get(manifest.sourceId) || [];
    manifests.push(manifest);
    managedBySource.set(manifest.sourceId, manifests);
    const catalogId = manifest.discoverySource?.name;
    if (catalogId) {
      const catalogManifests = managedByCatalog.get(catalogId) || [];
      catalogManifests.push(manifest);
      managedByCatalog.set(catalogId, catalogManifests);
    }
  }
  const claimedRepositories = new Map(
    sources
      .filter((source): source is Extract<SourceDefinition, { type: "github" }> => source.type === "github")
      .map((source) => [source.repository.toLowerCase(), source.id]),
  );

  // A target is either a source id or a capability id. Only a source id can narrow
  // the run up front; a capability id is resolved after discovery.
  const bySourceId = sources.filter((source) => targets.includes(source.id));
  const selectedSources = bySourceId.length > 0 ? bySourceId : sources;

  for (const source of selectedSources) {
    if (source.type !== "web-catalog") {
      runs.push({ definition: source });
      continue;
    }

    try {
      const catalogSource = source as Extract<SourceDefinition, { type: "web-catalog" }>;
      const revision = await catalog.getRevision(catalogSource);
      const delegatedSources = await catalog.discoverSources(catalogSource, revision);
      report.sourceChecks.push({
        sourceId: source.id,
        sourceType: source.type,
        status: "success",
        revision: revision.value,
        checkedAt: revision.fetchedAt,
      });
      const delegatedState = new Map<string, { allowed: boolean; coveredBy?: string }>();

      for (const delegated of delegatedSources) {
        const repository = (delegated.definition as { repository?: string }).repository || delegated.definition.id;
        const coveredBy = claimedRepositories.get(repository.toLowerCase());
        delegatedState.set(delegated.definition.id, { allowed: delegated.allowed, coveredBy });
        if (coveredBy) {
          report.duplicateSources.push({ sourceId: source.id, repository, coveredBy });
          continue;
        }

        if (!delegated.allowed) {
          report.catalogCandidates.push({
            sourceId: source.id,
            repository,
            url: delegated.discoverySource.url,
          });
          continue;
        }

        claimedRepositories.set(repository.toLowerCase(), delegated.definition.id);
        runs.push({ definition: delegated.definition, discoverySource: delegated.discoverySource });
      }

      for (const manifest of managedByCatalog.get(source.id) || []) {
        const state = delegatedState.get(manifest.sourceId);
        if (state?.allowed && !state.coveredBy) continue;

        const reason = !state
          ? `delegated repository is no longer published by catalogue ${source.id}; existing local content was kept`
          : state.coveredBy
            ? `delegated repository is now covered by declared source ${state.coveredBy}; existing local content was kept`
            : `delegated repository is no longer allowed by catalogue ${source.id}; existing local content was kept`;
        const status: SyncStatus = !state ? "removed-upstream" : "unavailable";
        report.entries.push({
          capabilityId: manifest.capability,
          sourceId: manifest.sourceId,
          status,
          applied: false,
          policy: manifest.update || updatePolicyOf(source),
          previousRevision: manifest.commit || manifest.revision?.value,
          reason,
          overrideConflicts: await overrideConflicts(root, manifest.namespace, manifest.slug, manifest),
        });
        if (status === "unavailable") report.errors.push({ sourceId: manifest.sourceId, message: reason });
      }
    } catch (error) {
      report.sourceChecks.push({
        sourceId: source.id,
        sourceType: source.type,
        status: "error",
        checkedAt: new Date().toISOString(),
      });
      report.errors.push({
        sourceId: source.id,
        message: error instanceof Error ? error.message : "unknown catalogue error",
      });
    }
  }

  for (const run of runs) {
    const source = run.definition;
    const adapter = adaptersByType.get(source.type);
    if (!adapter) continue;

    const policy = updatePolicyOf(source);

    let capabilities: DiscoveredCapability[];
    let revision: SourceRevision | undefined;
    try {
      revision = await adapter.getRevision(source);
      capabilities = await adapter.discover(source, revision);
      report.sourceChecks.push({
        sourceId: source.id,
        sourceType: source.type,
        status: "success",
        revision: revision.value,
        checkedAt: revision.fetchedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown source error";
      report.sourceChecks.push({
        sourceId: source.id,
        sourceType: source.type,
        status: "error",
        ...(revision ? { revision: revision.value, checkedAt: revision.fetchedAt } : { checkedAt: new Date().toISOString() }),
      });
      report.errors.push({ sourceId: source.id, message });
      report.entries.push({
        capabilityId: `${source.id}:*`,
        sourceId: source.id,
        status: "unavailable",
        applied: false,
        policy,
        reason: message,
      });
      continue;
    }

    const existing = managedBySource.get(source.id) || [];
    const discoveredIds = new Set(capabilities.map((capability) => capability.capabilityId));
    const replacements = new Map(
      capabilities
        .map((capability) => {
          const identity = originIdentity(capability.origin);
          return identity ? [identity, capability.capabilityId] as const : undefined;
        })
        .filter((entry): entry is readonly [string, string] => entry !== undefined),
    );
    const contentHashCandidates = new Map<string, string[]>();
    for (const capability of capabilities) {
      const candidates = contentHashCandidates.get(capability.contentHash) || [];
      candidates.push(capability.capabilityId);
      contentHashCandidates.set(capability.contentHash, candidates);
    }

    for (const previous of existing) {
      if (discoveredIds.has(previous.capability)) continue;
      const replacementByOrigin = originIdentity(previous)
        ? replacements.get(originIdentity(previous)!)
        : undefined;
      const replacementByHash = previous.contentHash
        ? contentHashCandidates.get(previous.contentHash)
        : undefined;
      const replacementCapabilityId = replacementByOrigin
        || (replacementByHash?.length === 1 ? replacementByHash[0] : undefined);
      report.entries.push({
        capabilityId: previous.capability,
        sourceId: source.id,
        status: replacementCapabilityId ? "renamed-upstream" : "removed-upstream",
        applied: false,
        policy,
        previousRevision: previous.commit || previous.revision?.value,
        replacementCapabilityId,
        reason: replacementCapabilityId
          ? `upstream identity moved to ${replacementCapabilityId}; existing local content was kept`
          : "capability is no longer discovered upstream; existing local content was kept",
        overrideConflicts: await overrideConflicts(root, previous.namespace, previous.slug, previous),
      });
    }

    for (const capability of capabilities) {
      try {
        assertSafeSegment(capability.namespace, "namespace");
        assertSafeSegment(capability.slug, "slug");

        const previous = await readManifest(root, capability.namespace, capability.slug);
        const status: SyncStatus = !previous
          ? "new"
          : previous.contentHash === capability.contentHash
            ? "up-to-date"
            : "update-available";

        const targeted =
          targets.includes(capability.capabilityId) || targets.includes(source.id) || targets.includes(capability.slug);

        const entry: SyncEntry = {
          capabilityId: capability.capabilityId,
          sourceId: source.id,
          status,
          applied: false,
          policy,
          revision: capability.origin.commit || capability.origin.revision?.value,
          previousRevision: previous?.commit || previous?.revision?.value,
          changes: status === "update-available" ? diffFiles(previous?.files, capability.files) : undefined,
          overrideConflicts: await overrideConflicts(root, capability.namespace, capability.slug, previous),
        };

        if (status !== "up-to-date" && apply && mayWrite(status, policy, targeted)) {
          const ownership = await checkOwnership(
            root,
            source.id,
            capability.namespace,
            capability.slug,
            capability.capabilityId,
          );
          if (!ownership.ok) {
            entry.status = "unavailable";
            entry.reason = ownership.reason;
            report.errors.push({ sourceId: source.id, message: entry.reason });
          } else {
            try {
              const files = await adapter.fetch(source, capability);
              const manifest = buildManifest(capability, policy, run.discoverySource, files);
              await writeCapability(root, capability, files, manifest);
              entry.applied = true;
              entry.overrideConflicts = await overrideConflicts(
                root,
                capability.namespace,
                capability.slug,
                manifest,
              );
            } catch (error) {
              entry.status = "unavailable";
              entry.reason = error instanceof Error ? error.message : "unknown fetch error";
              report.errors.push({ sourceId: source.id, message: entry.reason });
            }
          }
        } else if (status === "update-available" && apply && !targeted) {
          entry.reason = `policy "${policy}": run sources:sync --apply ${capability.capabilityId} to accept`;
        }

        report.entries.push(entry);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown capability error";
        report.errors.push({ sourceId: source.id, message });
        report.entries.push({
          capabilityId: capability.capabilityId,
          sourceId: source.id,
          status: "unavailable",
          applied: false,
          policy,
          reason: message,
        });
      }
    }
  }

  return report;
}
