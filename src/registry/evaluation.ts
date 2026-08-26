import type { CapabilitySearchOptions, CapabilitySearchResult } from "./types";

export interface SearchEvaluationFile {
  capabilityId: string;
  path: string;
}

export interface SearchEvaluationCase {
  id: string;
  query: string;
  /** Any of these capabilities is a relevant answer, in no preferred order. */
  expectedCapabilityIds: string[];
  /** Optional expected first file for the relevant capability selected by search. */
  expectedFiles?: SearchEvaluationFile[];
  critical?: boolean;
  limit?: number;
  /** Response-size target, measured on the JSON search result rather than tokens. */
  contextBudgetCharacters?: number;
}

export interface SearchEvaluationCaseResult {
  id: string;
  query: string;
  critical: boolean;
  relevantRank?: number;
  successAt1: boolean;
  recallAt3: boolean;
  reciprocalRank: number;
  topCapabilityIds: string[];
  recommendedFile?: SearchEvaluationFile;
  fileRecommendationMatch?: boolean;
  resultCharacters: number;
  contextBudgetCharacters?: number;
  contextBudgetPass?: boolean;
}

export interface SearchEvaluationSummary {
  cases: number;
  criticalCases: number;
  successAt1: number;
  recallAt3: number;
  meanReciprocalRank: number;
  fileRecommendationAccuracy?: number;
  averageResultCharacters: number;
  maxResultCharacters: number;
  contextBudgetPassRate?: number;
}

export interface SearchEvaluationReport {
  results: SearchEvaluationCaseResult[];
  summary: SearchEvaluationSummary;
}

export type CapabilitySearch = (
  query: string,
  options?: CapabilitySearchOptions,
) => CapabilitySearchResult[];

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function uniqueCapabilityIds(results: CapabilitySearchResult[]): string[] {
  return [...new Set(results.map((result) => result.capabilityId))];
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

export function evaluateSearch(
  cases: SearchEvaluationCase[],
  search: CapabilitySearch,
): SearchEvaluationReport {
  const results = cases.map((evaluationCase): SearchEvaluationCaseResult => {
    const hits = search(evaluationCase.query, { limit: evaluationCase.limit ?? 20 });
    const topCapabilityIds = uniqueCapabilityIds(hits);
    const expected = new Set(evaluationCase.expectedCapabilityIds);
    const relevantIndex = topCapabilityIds.findIndex((capabilityId) => expected.has(capabilityId));
    const relevantRank = relevantIndex === -1 ? undefined : relevantIndex + 1;
    const selectedCapabilityId = relevantRank === undefined ? undefined : topCapabilityIds[relevantRank - 1];
    const selectedHit = selectedCapabilityId === undefined
      ? undefined
      : hits.find((hit) => hit.capabilityId === selectedCapabilityId);
    const recommendedFile = selectedHit
      ? { capabilityId: selectedHit.capabilityId, path: selectedHit.path }
      : undefined;
    // MCP tools currently serialize values with two-space indentation. Measure
    // the payload an agent actually receives rather than a smaller compact JSON.
    const resultCharacters = JSON.stringify(hits, null, 2).length;
    const contextBudgetCharacters = evaluationCase.contextBudgetCharacters;

    return {
      id: evaluationCase.id,
      query: evaluationCase.query,
      critical: evaluationCase.critical ?? false,
      ...(relevantRank === undefined ? {} : { relevantRank }),
      successAt1: relevantRank === 1,
      recallAt3: relevantRank !== undefined && relevantRank <= 3,
      reciprocalRank: relevantRank === undefined ? 0 : 1 / relevantRank,
      topCapabilityIds,
      ...(recommendedFile ? { recommendedFile } : {}),
      ...(evaluationCase.expectedFiles
        ? {
            fileRecommendationMatch: recommendedFile !== undefined
              && evaluationCase.expectedFiles.some(
                (file) => file.capabilityId === recommendedFile.capabilityId && file.path === recommendedFile.path,
              ),
          }
        : {}),
      resultCharacters,
      ...(contextBudgetCharacters === undefined
        ? {}
        : {
            contextBudgetCharacters,
            contextBudgetPass: resultCharacters <= contextBudgetCharacters,
          }),
    };
  });

  const fileResults = results.filter((result) => result.fileRecommendationMatch !== undefined);
  const budgetResults = results.filter((result) => result.contextBudgetPass !== undefined);

  return {
    results,
    summary: {
      cases: results.length,
      criticalCases: results.filter((result) => result.critical).length,
      successAt1: round(ratio(results.filter((result) => result.successAt1).length, results.length)),
      recallAt3: round(ratio(results.filter((result) => result.recallAt3).length, results.length)),
      meanReciprocalRank: round(ratio(
        results.reduce((total, result) => total + result.reciprocalRank, 0),
        results.length,
      )),
      ...(fileResults.length === 0
        ? {}
        : {
            fileRecommendationAccuracy: round(ratio(
              fileResults.filter((result) => result.fileRecommendationMatch).length,
              fileResults.length,
            )),
          }),
      averageResultCharacters: Math.round(ratio(
        results.reduce((total, result) => total + result.resultCharacters, 0),
        results.length,
      )),
      maxResultCharacters: results.reduce(
        (maximum, result) => Math.max(maximum, result.resultCharacters),
        0,
      ),
      ...(budgetResults.length === 0
        ? {}
        : {
            contextBudgetPassRate: round(ratio(
              budgetResults.filter((result) => result.contextBudgetPass).length,
              budgetResults.length,
            )),
          }),
    },
  };
}

export function criticalSearchFailures(report: SearchEvaluationReport): SearchEvaluationCaseResult[] {
  return report.results.filter(
    (result) => result.critical && (!result.recallAt3 || result.fileRecommendationMatch === false),
  );
}
