import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SyncReport } from "../../ingestion/sync";
import type { SourceDefinitionBase } from "../../ingestion/types";
import { readSourceHealthSnapshot } from "../../local/source-health-file";
import { persistSourceHealthRun } from "../source-health-core";

let root: string;
const sources: SourceDefinitionBase[] = [
  { id: "alpha", type: "memory" },
  { id: "beta", type: "memory" },
];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "mcpimp-source-health-core-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function checkedReport(sourceId: string, status: "up-to-date" | "update-available"): SyncReport {
  return {
    sourceChecks: [{
      sourceId,
      sourceType: "memory",
      status: "success",
      revision: `${sourceId}-revision`,
      checkedAt: "2026-08-31T10:00:00.000Z",
    }],
    entries: [{
      capabilityId: `${sourceId}-tool`,
      sourceId,
      status,
      applied: false,
      policy: "review",
      revision: `${sourceId}-revision`,
    }],
    errors: [],
    catalogCandidates: [],
    duplicateSources: [],
  };
}

describe("persistSourceHealthRun", () => {
  it("preserves unchecked source records when a later run targets one source", async () => {
    const initial: SyncReport = {
      ...checkedReport("alpha", "up-to-date"),
      sourceChecks: [
        ...checkedReport("alpha", "up-to-date").sourceChecks,
        ...checkedReport("beta", "up-to-date").sourceChecks,
      ],
      entries: [
        ...checkedReport("alpha", "up-to-date").entries,
        ...checkedReport("beta", "up-to-date").entries,
      ],
    };
    await persistSourceHealthRun({ root, sources, targets: [], report: initial });
    await persistSourceHealthRun({
      root,
      sources,
      targets: ["alpha"],
      report: checkedReport("alpha", "update-available"),
    });

    const persisted = await readSourceHealthSnapshot(root);
    expect(persisted?.sources.find((source) => source.sourceId === "alpha")?.status).toBe("pending");
    expect(persisted?.sources.find((source) => source.sourceId === "beta")?.status).toBe("healthy");
  });
});
