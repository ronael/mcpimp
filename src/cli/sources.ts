import { resolve } from "node:path";
import { loadDotenv } from "../env/load-dotenv";
import { loadSourceDefinitions } from "../ingestion/definitions";
import { syncSources, type SyncEntry, type SyncReport } from "../ingestion/sync";

/**
 * `pnpm sources:sync [--apply] [target…]`
 *
 * Default run is read-only: it reports what each source would do. Writing needs
 * `--apply`, and updating an existing capability under a `review`/`manual` policy
 * additionally needs that capability (or its source) named as a target.
 */

const STATUS_MARKS: Record<SyncEntry["status"], string> = {
  "up-to-date": "✓",
  "update-available": "↑",
  new: "+",
  unavailable: "✗",
};

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const json = argv.includes("--json");
  const targets = argv.filter((arg) => !arg.startsWith("--"));

  return { apply, json, targets };
}

function formatEntry(entry: SyncEntry): string {
  const mark = STATUS_MARKS[entry.status];
  const applied = entry.applied ? " (applied)" : "";
  const head = `${mark} ${entry.capabilityId.padEnd(34)} ${entry.status}${applied}`;

  const details: string[] = [];
  if (entry.revision) {
    details.push(
      entry.previousRevision && entry.previousRevision !== entry.revision
        ? `    revision ${entry.previousRevision.slice(0, 10)} → ${entry.revision.slice(0, 10)}`
        : `    revision ${entry.revision.slice(0, 10)}`,
    );
  }
  if (entry.changes) {
    const { added, removed, modified } = entry.changes;
    details.push(`    +${added.length} ~${modified.length} -${removed.length}`);
    for (const path of [...added.map((p) => `+ ${p}`), ...modified.map((p) => `~ ${p}`), ...removed.map((p) => `- ${p}`)].slice(0, 12)) {
      details.push(`      ${path}`);
    }
  }
  if (entry.reason) details.push(`    ${entry.reason}`);

  return [head, ...details].join("\n");
}

function printReport(report: SyncReport, apply: boolean): void {
  if (report.entries.length === 0) {
    console.log("No capability discovered. Check sources/*.json.");
  }

  for (const entry of report.entries) {
    console.log(formatEntry(entry));
  }

  if (report.catalogCandidates.length > 0) {
    console.log(`\nDiscovered through catalogues but not allowed for import (${report.catalogCandidates.length}):`);
    for (const candidate of report.catalogCandidates) {
      console.log(`  · ${candidate.repository}  (via ${candidate.sourceId})`);
    }
    console.log('  Add a repository to "allowedRepositories" in its catalogue source to import it.');
  }

  if (report.errors.length > 0) {
    console.log(`\nErrors (${report.errors.length}):`);
    for (const error of report.errors) {
      console.log(`  ✗ ${error.sourceId}: ${error.message}`);
    }
  }

  const pending = report.entries.filter(
    (entry) => (entry.status === "update-available" || entry.status === "new") && !entry.applied,
  );

  if (!apply && pending.length > 0) {
    console.log(`\n${pending.length} change(s) pending. Re-run with --apply to write them.`);
  }
}

const { apply, json, targets } = parseArgs(process.argv.slice(2));

await loadDotenv();

const root = resolve(process.env.MCPIMP_ROOT || ".");
const sources = await loadSourceDefinitions(root);

if (sources.length === 0) {
  console.error(`No source definition found in ${root}/catalog/sources.`);
  process.exit(1);
}

const report = await syncSources({ root, sources, apply, targets });

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report, apply);
}

if (report.errors.length > 0) process.exit(1);
