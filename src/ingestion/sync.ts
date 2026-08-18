import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { CAPABILITIES_DIR } from "../core/paths";
import { OVERRIDES_DIR, SOURCE_MANIFEST, UPSTREAM_DIR } from "../registry/filesystem";
import type { CapabilityDiscoverySource, CapabilityOrigin, UpdatePolicy } from "../registry/types";
import { GitHubSourceAdapter } from "./github";
import { assertSafeSegment, capabilityIdFor } from "../core/names";
import { assertSafeRelativePath, classifySkill, sha256 } from "./normalize";
import { updatePolicyOf, type DiscoveredSkill, type SourceDefinition } from "./types";
import { WebCatalogSourceAdapter } from "./web-catalog";

export type SyncStatus = "new" | "up-to-date" | "update-available" | "unavailable";

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
  changes?: { added: string[]; removed: string[]; modified: string[] };
  reason?: string;
}

export interface SyncReport {
  entries: SyncEntry[];
  /** Repositories a catalogue exposed but that are not allowed for import. */
  catalogCandidates: { sourceId: string; repository: string; url: string }[];
  errors: { sourceId: string; message: string }[];
}

export interface SyncOptions {
  root: string;
  sources: SourceDefinition[];
  /** Without this, sync only reports: nothing is ever written. */
  apply?: boolean;
  /** Source ids or capability ids explicitly named on the command line. */
  targets?: string[];
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

  if (manifest.sourceId !== sourceId || manifest.capability !== capabilityId) {
    return {
      ok: false,
      reason: `capability "${capabilityId}" is owned by source "${manifest.sourceId}" (${manifest.capability}); refusing takeover by "${sourceId}"`,
    };
  }

  return { ok: true };
}

function diffFiles(previous: SyncFileRecord[] | undefined, next: DiscoveredSkill["files"]) {
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

async function writeSkill(
  root: string,
  skill: DiscoveredSkill,
  files: { path: string; bytes: Uint8Array }[],
  manifest: SourceManifest,
): Promise<void> {
  const capabilityRoot = assertInsideCapabilities(
    root,
    capabilityRootFor(root, skill.namespace, skill.slug),
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

function buildManifest(
  skill: DiscoveredSkill,
  policy: UpdatePolicy,
  discoverySource: CapabilityDiscoverySource | undefined,
  files: { path: string; bytes: Uint8Array }[],
): SourceManifest {
  const written = new Map(files.map((file) => [file.path, file.bytes]));

  // Discovery classifies from paths only. Now that the content is here, refine it:
  // only the manifest text can reveal a platform dependency such as a plugin root.
  const skillBytes = written.get("SKILL.md");
  const classification = classifySkill(
    [...skill.files, ...skill.skippedAssets.map((asset) => ({ path: asset.path, binary: true }))],
    skillBytes ? new TextDecoder("utf-8").decode(skillBytes) : "",
  );

  return {
    ...skill.origin,
    capability: skill.capabilityId,
    namespace: skill.namespace,
    slug: skill.slug,
    discoverySource,
    skillKind: classification.kind,
    skillTraits: classification.traits,
    update: policy,
    lastSyncedAt: new Date().toISOString(),
    files: skill.files.map((file) => ({
      path: file.path,
      bytes: file.bytes,
      binary: file.binary,
      sha: file.sha,
      sha256: written.has(file.path) ? sha256(written.get(file.path)!) : undefined,
    })),
  };
}

interface SourceRun {
  definition: SourceDefinition;
  discoverySource?: CapabilityDiscoverySource;
}

/**
 * Reports, and optionally applies, the state of every registered source.
 *
 * Discovery is always cheap: one revision call plus one tree call per repository.
 * Files are downloaded only when the per-skill content hash actually moved, so an
 * unchanged capability costs no bandwidth and is never rewritten.
 */
export async function syncSources(options: SyncOptions): Promise<SyncReport> {
  const { root, sources, apply = false, targets = [] } = options;
  const github = new GitHubSourceAdapter();
  const catalog = new WebCatalogSourceAdapter();

  const report: SyncReport = { entries: [], catalogCandidates: [], errors: [] };
  const runs: SourceRun[] = [];

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
      for (const delegated of await catalog.discoverSources(source)) {
        if (!delegated.allowed) {
          report.catalogCandidates.push({
            sourceId: source.id,
            repository: (delegated.definition as { repository?: string }).repository || delegated.definition.id,
            url: delegated.discoverySource.url,
          });
          continue;
        }

        runs.push({ definition: delegated.definition, discoverySource: delegated.discoverySource });
      }
    } catch (error) {
      report.errors.push({
        sourceId: source.id,
        message: error instanceof Error ? error.message : "unknown catalogue error",
      });
    }
  }

  for (const run of runs) {
    const source = run.definition;
    if (source.type !== "github") continue;

    const policy = updatePolicyOf(source);

    let skills: DiscoveredSkill[];
    try {
      const revision = await github.getRevision(source);
      skills = await github.discover(source, revision);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown source error";
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

    for (const skill of skills) {
      try {
        assertSafeSegment(skill.namespace, "namespace");
        assertSafeSegment(skill.slug, "slug");

        const previous = await readManifest(root, skill.namespace, skill.slug);
        const status: SyncStatus = !previous
          ? "new"
          : previous.contentHash === skill.contentHash
            ? "up-to-date"
            : "update-available";

        const targeted =
          targets.includes(skill.capabilityId) || targets.includes(source.id) || targets.includes(skill.slug);

        const entry: SyncEntry = {
          capabilityId: skill.capabilityId,
          sourceId: source.id,
          status,
          applied: false,
          policy,
          revision: skill.origin.commit,
          previousRevision: previous?.commit,
          changes: status === "update-available" ? diffFiles(previous?.files, skill.files) : undefined,
        };

        if (status !== "up-to-date" && apply && mayWrite(status, policy, targeted)) {
          const ownership = await checkOwnership(root, source.id, skill.namespace, skill.slug, skill.capabilityId);
          if (!ownership.ok) {
            entry.status = "unavailable";
            entry.reason = ownership.reason;
            report.errors.push({ sourceId: source.id, message: entry.reason });
          } else {
            try {
              const files = await github.fetch(source, skill);
              const manifest = buildManifest(skill, policy, run.discoverySource, files);
              await writeSkill(root, skill, files, manifest);
              entry.applied = true;
            } catch (error) {
              entry.status = "unavailable";
              entry.reason = error instanceof Error ? error.message : "unknown fetch error";
              report.errors.push({ sourceId: source.id, message: entry.reason });
            }
          }
        } else if (status === "update-available" && apply && !targeted) {
          entry.reason = `policy "${policy}": run sources:sync --apply ${skill.capabilityId} to accept`;
        }

        report.entries.push(entry);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown skill error";
        report.errors.push({ sourceId: source.id, message });
        report.entries.push({
          capabilityId: skill.capabilityId,
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
