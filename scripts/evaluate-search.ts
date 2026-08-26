import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CAPABILITIES_DIR } from "../src/core/paths";
import { criticalSearchFailures, evaluateSearch } from "../src/registry/evaluation";
import { FileSystemCapabilityRegistry } from "../src/registry/filesystem";
import { SEARCH_EVALUATION_CORPUS } from "../test/evaluation/search-corpus";

function percentage(value: number | undefined): string {
  return value === undefined ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

export async function runSearchEvaluation(root = process.cwd()) {
  const registry = await FileSystemCapabilityRegistry.scan(resolve(root, CAPABILITIES_DIR));
  return evaluateSearch(
    SEARCH_EVALUATION_CORPUS,
    (query, options) => registry.search(query, options),
  );
}

const isDirectRun = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  const report = await runSearchEvaluation(resolve(process.env.MCPIMP_ROOT || process.cwd()));

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.table(report.results.map((result) => ({
      case: result.id,
      rank: result.relevantRank ?? "—",
      top3: result.recallAt3 ? "yes" : "no",
      file: result.fileRecommendationMatch === undefined
        ? "n/a"
        : result.fileRecommendationMatch ? "yes" : "no",
      characters: result.resultCharacters,
      budget: result.contextBudgetPass === undefined
        ? "n/a"
        : result.contextBudgetPass ? "yes" : "no",
    })));

    console.log([
      `Success@1 ${percentage(report.summary.successAt1)}`,
      `Recall@3 ${percentage(report.summary.recallAt3)}`,
      `MRR ${report.summary.meanReciprocalRank.toFixed(4)}`,
      `file accuracy ${percentage(report.summary.fileRecommendationAccuracy)}`,
      `budget pass ${percentage(report.summary.contextBudgetPassRate)}`,
      `average ${report.summary.averageResultCharacters} chars`,
      `max ${report.summary.maxResultCharacters} chars`,
    ].join(" · "));
  }

  const failures = criticalSearchFailures(report);
  if (failures.length > 0) {
    console.error(`Critical retrieval failures: ${failures.map((failure) => failure.id).join(", ")}`);
    process.exitCode = 1;
  }
}
