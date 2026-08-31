import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SourceHealthSnapshot } from "../../ingestion/source-health";
import {
  readSourceHealthSnapshot,
  sourceHealthPath,
  writeSourceHealthSnapshot,
} from "../source-health-file";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "mcpimp-source-health-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function snapshot(status: "healthy" | "pending" = "healthy"): SourceHealthSnapshot {
  return {
    version: 1,
    generatedAt: "2026-08-31T10:00:00.000Z",
    sources: [{
      sourceId: "alpha",
      sourceType: "github",
      status,
      pending: { total: status === "pending" ? 1 : 0, new: 0, updates: status === "pending" ? 1 : 0, removals: 0, renames: 0 },
      errors: [],
    }],
  };
}

describe("source health snapshot file", () => {
  it("writes and reads the versioned snapshot under ignored runtime logs", async () => {
    await writeSourceHealthSnapshot(root, snapshot());

    await expect(readSourceHealthSnapshot(root)).resolves.toEqual(snapshot());
    await expect(readFile(sourceHealthPath(root), "utf8")).resolves.toContain('"version": 1');
  });

  it("atomically replaces the previous snapshot", async () => {
    await writeSourceHealthSnapshot(root, snapshot());
    await writeSourceHealthSnapshot(root, snapshot("pending"));

    await expect(readSourceHealthSnapshot(root)).resolves.toEqual(snapshot("pending"));
  });

  it("returns undefined when no check has been persisted", async () => {
    await expect(readSourceHealthSnapshot(root)).resolves.toBeUndefined();
  });

  it("rejects a partial or corrupted runtime snapshot", async () => {
    await mkdir(join(root, "logs"), { recursive: true });
    await writeFile(sourceHealthPath(root), JSON.stringify({
      version: 1,
      generatedAt: "not-a-date",
      sources: [{ sourceId: "alpha", status: "healthy", pending: { total: -1 }, errors: [] }],
    }));

    await expect(readSourceHealthSnapshot(root)).rejects.toThrow("Invalid source health snapshot header");
  });
});
