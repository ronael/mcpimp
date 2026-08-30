import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CAPABILITIES_DIR } from "../src/core/paths";
import { FileSystemCapabilityRegistry } from "../src/registry/filesystem";
import {
  criticalRoutingFailures,
  evaluateRouting,
  isRoutingEvaluationPass,
} from "../src/registry/routing-evaluation";
import { resolveCapabilities } from "../src/registry/routing";
import { ROUTING_EVALUATION_CORPUS } from "../test/evaluation/routing-corpus";

export async function runRoutingEvaluation(root = process.cwd()) {
  const registry = await FileSystemCapabilityRegistry.scan(resolve(root, CAPABILITIES_DIR));
  return evaluateRouting(ROUTING_EVALUATION_CORPUS, (input) => resolveCapabilities(registry, input));
}

const isDirectRun = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  const report = await runRoutingEvaluation(resolve(process.env.MCPIMP_ROOT || process.cwd()));

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.table(report.results.map((result) => ({
      case: result.id,
      primary: result.primaryId || "-",
      supporting: result.supportingIds.join(", ") || "-",
      pass: isRoutingEvaluationPass(result) ? "yes" : "no",
    })));
    console.log(`Routing pass rate ${(report.summary.passRate * 100).toFixed(1)}%`);
  }

  const failures = criticalRoutingFailures(report);
  if (failures.length > 0) {
    console.error(`Critical routing failures: ${failures.map((failure) => failure.id).join(", ")}`);
    process.exitCode = 1;
  }
}
