import { describe, expect, it } from "vitest";
import {
  buildSourceHealthSnapshot,
  mergeSourceHealthSnapshots,
  type SourceHealthSnapshot,
} from "../source-health";
import type { SyncReport } from "../sync";
import type { SourceDefinitionBase } from "../types";

const definitions: SourceDefinitionBase[] = [
  { id: "alpha", type: "github" },
  { id: "beta", type: "web-catalog" },
];

function report(overrides: Partial<SyncReport> = {}): SyncReport {
  return {
    entries: [],
    catalogCandidates: [],
    duplicateSources: [],
    errors: [],
    sourceChecks: [],
    ...overrides,
  };
}

describe("source health snapshots", () => {
  it("separates local sync state, available revision, and pending changes", () => {
    const snapshot = buildSourceHealthSnapshot({
      definitions,
      checkedAt: "2026-08-31T10:00:00.000Z",
      localOrigins: [{
        sourceId: "alpha",
        revision: "local-revision",
        lastSyncedAt: "2026-08-30T09:00:00.000Z",
      }],
      report: report({
        sourceChecks: [{
          sourceId: "alpha",
          sourceType: "github",
          status: "success",
          revision: "available-revision",
          checkedAt: "2026-08-31T09:59:58.000Z",
        }],
        entries: [{
          capabilityId: "alpha-tool",
          sourceId: "alpha",
          status: "update-available",
          applied: false,
          policy: "review",
          revision: "available-revision",
          previousRevision: "local-revision",
        }],
      }),
    });

    expect(snapshot.sources).toContainEqual(expect.objectContaining({
      sourceId: "alpha",
      sourceType: "github",
      status: "pending",
      lastCheckedAt: "2026-08-31T09:59:58.000Z",
      lastSyncedAt: "2026-08-30T09:00:00.000Z",
      localRevisions: ["local-revision"],
      availableRevisions: ["available-revision"],
      pending: { total: 1, new: 0, updates: 1, removals: 0, renames: 0 },
      errors: [],
    }));
    expect(snapshot.sources).toContainEqual(expect.objectContaining({ sourceId: "beta", status: "unchecked" }));
  });

  it("redacts credentials from persisted source errors", () => {
    const snapshot = buildSourceHealthSnapshot({
      definitions,
      checkedAt: "2026-08-31T10:00:00.000Z",
      localOrigins: [],
      report: report({
        sourceChecks: [{
          sourceId: "alpha",
          sourceType: "github",
          status: "error",
          checkedAt: "2026-08-31T10:00:00.000Z",
        }],
        errors: [{
          sourceId: "alpha",
          message: "GET https://api.example.test/data?access_token=secret-token failed with Bearer private-token",
        }],
      }),
    });

    const alpha = snapshot.sources.find((source) => source.sourceId === "alpha");
    expect(alpha).toMatchObject({ status: "error" });
    expect(alpha?.errors[0]).toContain("access_token=[redacted]");
    expect(alpha?.errors[0]).toContain("Bearer [redacted]");
    expect(JSON.stringify(snapshot)).not.toContain("secret-token");
    expect(JSON.stringify(snapshot)).not.toContain("private-token");
  });

  it("merges a targeted check without erasing untouched source health", () => {
    const previous: SourceHealthSnapshot = {
      version: 1,
      generatedAt: "2026-08-30T10:00:00.000Z",
      sources: [
        { sourceId: "alpha", sourceType: "github", status: "healthy", pending: { total: 0, new: 0, updates: 0, removals: 0, renames: 0 }, errors: [] },
        { sourceId: "beta", sourceType: "web-catalog", status: "error", pending: { total: 0, new: 0, updates: 0, removals: 0, renames: 0 }, errors: ["Source check failed"] },
      ],
    };
    const targeted: SourceHealthSnapshot = {
      version: 1,
      generatedAt: "2026-08-31T10:00:00.000Z",
      sources: [
        { sourceId: "alpha", sourceType: "github", status: "pending", pending: { total: 1, new: 1, updates: 0, removals: 0, renames: 0 }, errors: [] },
      ],
    };

    const merged = mergeSourceHealthSnapshots(previous, targeted);

    expect(merged.generatedAt).toBe(targeted.generatedAt);
    expect(merged.sources.find((source) => source.sourceId === "alpha")?.status).toBe("pending");
    expect(merged.sources.find((source) => source.sourceId === "beta")?.status).toBe("error");
  });
});
