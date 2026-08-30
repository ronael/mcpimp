import { resolve } from "node:path";
import { loadDotenv } from "../env/load-dotenv";
import { approveCapabilityReview, listCapabilityReviews } from "./review-core";

function parseArgs(argv: string[]) {
  const json = argv.includes("--json");
  const reviewerIndex = argv.indexOf("--reviewer");
  const reviewer = reviewerIndex >= 0 ? argv[reviewerIndex + 1] : undefined;
  const values = argv.filter((arg, index) => {
    if (arg === "--json" || arg === "--reviewer") return false;
    if (reviewerIndex >= 0 && index === reviewerIndex + 1) return false;
    return !arg.startsWith("--");
  });
  return { capabilityId: values[0], json, reviewer };
}

await loadDotenv();
const root = resolve(process.env.MCPIMP_ROOT || ".");
const { capabilityId, json, reviewer } = parseArgs(process.argv.slice(2));

try {
  if (!capabilityId) {
    const queue = await listCapabilityReviews(root);
    if (json) {
      console.log(JSON.stringify(queue, null, 2));
    } else if (queue.length === 0) {
      console.log("No imported capability requires review.");
    } else {
      console.log(`Capabilities requiring review (${queue.length}):`);
      for (const entry of queue) {
        console.log(`${entry.status.padEnd(15)} ${entry.id.padEnd(34)} ${entry.sourceId}`);
      }
      console.log("\nApprove exact current content with:");
      console.log("  pnpm capabilities:review -- <capability-id> --reviewer <name>");
    }
  } else {
    if (!reviewer) throw new Error("--reviewer <name> is required when approving a capability");
    const result = await approveCapabilityReview(root, capabilityId, reviewer);
    if (json) console.log(JSON.stringify(result, null, 2));
    else console.log(`Reviewed ${result.id} at ${result.reviewedContentHash} by ${result.reviewedBy}.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unknown review error");
  process.exitCode = 1;
}
