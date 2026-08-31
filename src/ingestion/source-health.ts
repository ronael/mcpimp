import type { SyncEntry, SyncReport } from "./sync";
import type { SourceDefinitionBase } from "./types";

export type SourceHealthStatus = "unchecked" | "healthy" | "pending" | "error";

export interface SourcePendingSummary {
  total: number;
  new: number;
  updates: number;
  removals: number;
  renames: number;
}

export interface SourceHealthEntry {
  sourceId: string;
  sourceType?: string;
  status: SourceHealthStatus;
  lastCheckedAt?: string;
  lastSyncedAt?: string;
  localRevisions?: string[];
  availableRevisions?: string[];
  pending: SourcePendingSummary;
  errors: string[];
}

export interface SourceHealthSnapshot {
  version: 1;
  generatedAt: string;
  sources: SourceHealthEntry[];
}

export interface LocalSourceOrigin {
  sourceId: string;
  revision?: string;
  lastSyncedAt?: string;
}

interface BuildSourceHealthOptions {
  definitions: SourceDefinitionBase[];
  checkedAt: string;
  localOrigins: LocalSourceOrigin[];
  report: SyncReport;
}

const EMPTY_PENDING: SourcePendingSummary = {
  total: 0,
  new: 0,
  updates: 0,
  removals: 0,
  renames: 0,
};

function uniqueSorted(values: Array<string | undefined>): string[] | undefined {
  const unique = [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  return unique.length > 0 ? unique : undefined;
}

function latest(values: Array<string | undefined>): string | undefined {
  return values
    .filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

export function sanitizeSourceError(message: string): string {
  return message
    .replace(/([?&](?:access_token|api_key|apikey|auth|key|secret|token)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b(?:gh[opsu]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[redacted]")
    .slice(0, 300);
}

function pendingSummary(entries: SyncEntry[]): SourcePendingSummary {
  const pending = entries.filter((entry) => !entry.applied && entry.status !== "up-to-date" && entry.status !== "unavailable");
  return {
    total: pending.length,
    new: pending.filter((entry) => entry.status === "new").length,
    updates: pending.filter((entry) => entry.status === "update-available").length,
    removals: pending.filter((entry) => entry.status === "removed-upstream").length,
    renames: pending.filter((entry) => entry.status === "renamed-upstream").length,
  };
}

export function buildSourceHealthSnapshot(options: BuildSourceHealthOptions): SourceHealthSnapshot {
  const ids = new Set([
    ...options.definitions.map((source) => source.id),
    ...options.localOrigins.map((origin) => origin.sourceId),
    ...options.report.sourceChecks.map((check) => check.sourceId),
    ...options.report.entries.map((entry) => entry.sourceId),
    ...options.report.errors.map((error) => error.sourceId),
  ]);

  const sources = [...ids].sort().map((sourceId): SourceHealthEntry => {
    const definition = options.definitions.find((source) => source.id === sourceId);
    const checks = options.report.sourceChecks.filter((check) => check.sourceId === sourceId);
    const entries = options.report.entries.filter((entry) => entry.sourceId === sourceId);
    const origins = options.localOrigins.filter((origin) => origin.sourceId === sourceId);
    const errors = [...new Set(options.report.errors
      .filter((error) => error.sourceId === sourceId)
      .map((error) => sanitizeSourceError(error.message)))];
    const pending = pendingSummary(entries);
    const checked = checks.length > 0 || entries.length > 0 || errors.length > 0;
    const status: SourceHealthStatus = errors.length > 0 || checks.some((check) => check.status === "error")
      ? "error"
      : pending.total > 0
        ? "pending"
        : checked
          ? "healthy"
          : "unchecked";
    const localRevisions = uniqueSorted(origins.map((origin) => origin.revision));
    const availableRevisions = uniqueSorted([
      ...checks.map((check) => check.revision),
      ...entries.map((entry) => entry.revision),
    ]);

    return {
      sourceId,
      sourceType: definition?.type || checks.find((check) => check.sourceType)?.sourceType,
      status,
      lastCheckedAt: latest(checks.map((check) => check.checkedAt)) || (checked ? options.checkedAt : undefined),
      lastSyncedAt: latest(origins.map((origin) => origin.lastSyncedAt)),
      ...(localRevisions ? { localRevisions } : {}),
      ...(availableRevisions ? { availableRevisions } : {}),
      pending,
      errors,
    };
  });

  return { version: 1, generatedAt: options.checkedAt, sources };
}

export function mergeSourceHealthSnapshots(
  previous: SourceHealthSnapshot | undefined,
  current: SourceHealthSnapshot,
): SourceHealthSnapshot {
  if (!previous) return current;
  const merged = new Map(previous.sources.map((source) => [source.sourceId, source]));
  for (const source of current.sources) merged.set(source.sourceId, source);
  return {
    version: 1,
    generatedAt: current.generatedAt,
    sources: [...merged.values()].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  };
}

export function emptySourceHealthSnapshot(generatedAt = new Date(0).toISOString()): SourceHealthSnapshot {
  return { version: 1, generatedAt, sources: [] };
}

export function withSourceDefinitions(
  snapshot: SourceHealthSnapshot | undefined,
  definitions: SourceDefinitionBase[],
): SourceHealthSnapshot {
  const current = snapshot || emptySourceHealthSnapshot();
  const sources = new Map(current.sources.map((source) => [source.sourceId, source]));
  for (const definition of definitions) {
    if (sources.has(definition.id)) continue;
    sources.set(definition.id, {
      sourceId: definition.id,
      sourceType: definition.type,
      status: "unchecked",
      pending: emptyPendingSummary(),
      errors: [],
    });
  }
  return {
    ...current,
    sources: [...sources.values()].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  };
}

export function emptyPendingSummary(): SourcePendingSummary {
  return { ...EMPTY_PENDING };
}
