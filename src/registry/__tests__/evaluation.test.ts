import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { criticalSearchFailures, evaluateSearch, type SearchEvaluationCase } from "../evaluation";
import { FileSystemCapabilityRegistry } from "../filesystem";
import type { CapabilitySearchResult } from "../types";
import { SEARCH_EVALUATION_CORPUS } from "../../../test/evaluation/search-corpus";

function hit(capabilityId: string, path = "SKILL.md"): CapabilitySearchResult {
  return {
    capabilityId,
    capabilityName: capabilityId,
    capabilityDescription: "",
    path,
    uri: `skill://${capabilityId}/${path}`,
    title: path,
    snippet: "",
    score: 1,
    matchedTerms: [],
  };
}

describe("search evaluation", () => {
  it("measures capability rank, file recommendation and context budget", () => {
    const cases: SearchEvaluationCase[] = [{
      id: "demo",
      query: "demo",
      expectedCapabilityIds: ["expected"],
      expectedFiles: [{ capabilityId: "expected", path: "references/answer.md" }],
      critical: true,
      contextBudgetCharacters: 10_000,
    }];
    const report = evaluateSearch(cases, () => [
      hit("noise"),
      hit("expected", "references/answer.md"),
      hit("expected", "references/other.md"),
    ]);

    expect(report.results[0]).toMatchObject({
      relevantRank: 2,
      successAt1: false,
      recallAt3: true,
      reciprocalRank: 0.5,
      fileRecommendationMatch: true,
      contextBudgetPass: true,
      topCapabilityIds: ["noise", "expected"],
    });
    expect(report.summary).toMatchObject({
      cases: 1,
      criticalCases: 1,
      successAt1: 0,
      recallAt3: 1,
      meanReciprocalRank: 0.5,
      fileRecommendationAccuracy: 1,
      contextBudgetPassRate: 1,
    });
    expect(criticalSearchFailures(report)).toEqual([]);
  });

  it("reports a critical miss or wrong recommended file as a failure", () => {
    const cases: SearchEvaluationCase[] = [{
      id: "critical",
      query: "critical",
      expectedCapabilityIds: ["expected"],
      expectedFiles: [{ capabilityId: "expected", path: "references/answer.md" }],
      critical: true,
    }];

    const missing = evaluateSearch(cases, () => [hit("one"), hit("two"), hit("three")]);
    const wrongFile = evaluateSearch(cases, () => [hit("expected", "SKILL.md")]);

    expect(criticalSearchFailures(missing)).toHaveLength(1);
    expect(criticalSearchFailures(wrongFile)).toHaveLength(1);
  });

  it("keeps the versioned corpus valid against the real catalog", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(resolve("catalog/capabilities"));
    const capabilities = registry.listCapabilities();
    const available = new Map(capabilities.map((capability) => [capability.id, capability]));
    const ids = SEARCH_EVALUATION_CORPUS.map((evaluationCase) => evaluationCase.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(SEARCH_EVALUATION_CORPUS.length).toBeGreaterThanOrEqual(10);

    for (const evaluationCase of SEARCH_EVALUATION_CORPUS) {
      expect(evaluationCase.query.trim(), evaluationCase.id).not.toBe("");
      expect(
        evaluationCase.expectedCapabilityIds.some((capabilityId) => available.has(capabilityId)),
        `${evaluationCase.id} should reference an available capability`,
      ).toBe(true);

      for (const expectedFile of evaluationCase.expectedFiles || []) {
        expect(
          available.get(expectedFile.capabilityId)?.files.some((file) => file.path === expectedFile.path),
          `${evaluationCase.id} should reference an available file: ${expectedFile.capabilityId}/${expectedFile.path}`,
        ).toBe(true);
      }
    }
  });
});
