import type { CapabilityResolution, ResolveCapabilitiesInput } from "./routing";

export interface RoutingEvaluationCase extends ResolveCapabilitiesInput {
  id: string;
  expectedPrimaryId: string;
  allowedSupportingIds?: string[];
  forbiddenCapabilityIds?: string[];
  critical?: boolean;
}

export interface RoutingEvaluationCaseResult {
  id: string;
  critical: boolean;
  primaryId?: string;
  supportingIds: string[];
  primaryMatch: boolean;
  supportingMatch: boolean;
  forbiddenMatch: boolean;
  conflictFree: boolean;
  budgetPass: boolean;
  entrypointPass: boolean;
}

export interface RoutingEvaluationReport {
  results: RoutingEvaluationCaseResult[];
  summary: { cases: number; criticalCases: number; passRate: number };
}

export type CapabilityResolver = (input: ResolveCapabilitiesInput) => CapabilityResolution;

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}

export function isRoutingEvaluationPass(result: RoutingEvaluationCaseResult): boolean {
  return result.primaryMatch
    && result.supportingMatch
    && result.forbiddenMatch
    && result.conflictFree
    && result.budgetPass
    && result.entrypointPass;
}

export function evaluateRouting(
  cases: RoutingEvaluationCase[],
  resolve: CapabilityResolver,
): RoutingEvaluationReport {
  const results = cases.map((evaluationCase): RoutingEvaluationCaseResult => {
    const resolution = resolve(evaluationCase);
    const selected = [
      ...(resolution.primary ? [resolution.primary.id] : []),
      ...resolution.supporting.map((candidate) => candidate.id),
    ];
    const selectedSet = new Set(selected);
    const supportingIds = resolution.supporting.map((candidate) => candidate.id);
    const allowedSupportingIds = new Set(evaluationCase.allowedSupportingIds || []);
    const forbiddenCapabilityIds = new Set(evaluationCase.forbiddenCapabilityIds || []);

    return {
      id: evaluationCase.id,
      critical: evaluationCase.critical ?? false,
      ...(resolution.primary ? { primaryId: resolution.primary.id } : {}),
      supportingIds,
      primaryMatch: resolution.primary?.id === evaluationCase.expectedPrimaryId,
      supportingMatch: supportingIds.every((id) => allowedSupportingIds.has(id)),
      forbiddenMatch: selected.every((id) => !forbiddenCapabilityIds.has(id)),
      conflictFree: !resolution.conflicts.some(({ ids }) => ids.every((id) => selectedSet.has(id))),
      budgetPass: resolution.budget.estimated <= resolution.budget.maximum,
      entrypointPass: (resolution.primary?.entrypoints.length || 0) > 0,
    };
  });

  return {
    results,
    summary: {
      cases: results.length,
      criticalCases: results.filter((result) => result.critical).length,
      passRate: ratio(results.filter(isRoutingEvaluationPass).length, results.length),
    },
  };
}

export function criticalRoutingFailures(report: RoutingEvaluationReport): RoutingEvaluationCaseResult[] {
  return report.results.filter((result) => result.critical && !isRoutingEvaluationPass(result));
}
