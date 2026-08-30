import { join } from "node:path";
import { CAPABILITIES_DIR } from "../core/paths";
import {
  buildSourceHealthSnapshot,
  mergeSourceHealthSnapshots,
  type LocalSourceOrigin,
  type SourceHealthSnapshot,
} from "../ingestion/source-health";
import type { SyncReport } from "../ingestion/sync";
import type { SourceDefinitionBase } from "../ingestion/types";
import { readSourceHealthSnapshot, writeSourceHealthSnapshot } from "../local/source-health-file";
import { FileSystemCapabilityRegistry } from "../registry/filesystem";

interface PersistSourceHealthRunOptions {
  root: string;
  sources: SourceDefinitionBase[];
  targets: string[];
  report: SyncReport;
  now?: () => Date;
}

function observedSourceIds(report: SyncReport): Set<string> {
  return new Set([
    ...report.sourceChecks.map((check) => check.sourceId),
    ...report.entries.map((entry) => entry.sourceId),
    ...report.errors.map((error) => error.sourceId),
  ]);
}

async function localOrigins(root: string): Promise<LocalSourceOrigin[]> {
  const registry = await FileSystemCapabilityRegistry.scan(join(root, CAPABILITIES_DIR));
  return registry.listCapabilities().flatMap((capability) => {
    const origin = capability.origin;
    if (!origin) return [];
    return [{
      sourceId: origin.sourceId,
      revision: origin.commit || origin.revision?.value,
      lastSyncedAt: origin.lastSyncedAt,
    }];
  });
}

export async function persistSourceHealthRun(
  options: PersistSourceHealthRunOptions,
): Promise<SourceHealthSnapshot> {
  const directlyTargeted = options.sources.filter((source) => options.targets.includes(source.id));
  const targetedRun = directlyTargeted.length > 0;
  const observed = observedSourceIds(options.report);
  for (const source of directlyTargeted) observed.add(source.id);
  const definitions = targetedRun ? directlyTargeted : options.sources;
  const origins = (await localOrigins(options.root)).filter((origin) => !targetedRun || observed.has(origin.sourceId));
  const current = buildSourceHealthSnapshot({
    definitions,
    checkedAt: (options.now || (() => new Date()))().toISOString(),
    localOrigins: origins,
    report: options.report,
  });
  const snapshot = targetedRun
    ? mergeSourceHealthSnapshots(await readSourceHealthSnapshot(options.root), current)
    : current;
  await writeSourceHealthSnapshot(options.root, snapshot);
  return snapshot;
}
