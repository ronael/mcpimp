import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SourceHealthEntry, SourceHealthSnapshot } from "../ingestion/source-health";

const SOURCE_HEALTH_FILE = "source-health.json";

export function sourceHealthPath(root: string): string {
  return join(root, "logs", SOURCE_HEALTH_FILE);
}

function isSourceHealthEntry(value: unknown): value is SourceHealthEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<SourceHealthEntry>;
  const pending = entry.pending;
  const validPending = Boolean(pending)
    && [pending?.total, pending?.new, pending?.updates, pending?.removals, pending?.renames]
      .every((count) => Number.isInteger(count) && Number(count) >= 0);
  const validRevisions = [entry.localRevisions, entry.availableRevisions]
    .every((values) => values === undefined || (Array.isArray(values) && values.every((item) => typeof item === "string")));
  return typeof entry.sourceId === "string"
    && ["unchecked", "healthy", "pending", "error"].includes(String(entry.status))
    && validPending
    && validRevisions
    && Array.isArray(entry.errors)
    && entry.errors.every((error) => typeof error === "string");
}

function parseSourceHealthSnapshot(raw: string): SourceHealthSnapshot {
  const parsed = JSON.parse(raw) as Partial<SourceHealthSnapshot>;
  if (
    parsed.version !== 1
    || typeof parsed.generatedAt !== "string"
    || !Number.isFinite(Date.parse(parsed.generatedAt))
    || !Array.isArray(parsed.sources)
  ) {
    throw new Error("Invalid source health snapshot header");
  }
  if (!parsed.sources.every(isSourceHealthEntry)) {
    throw new Error("Invalid source health snapshot entry");
  }
  return parsed as SourceHealthSnapshot;
}

export async function readSourceHealthSnapshot(root: string): Promise<SourceHealthSnapshot | undefined> {
  try {
    return parseSourceHealthSnapshot(await readFile(sourceHealthPath(root), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeSourceHealthSnapshot(root: string, snapshot: SourceHealthSnapshot): Promise<void> {
  const destination = sourceHealthPath(root);
  const temporary = `${destination}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await mkdir(dirname(destination), { recursive: true });
  try {
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}
