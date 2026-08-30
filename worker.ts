import { createServer } from "./src/http/server";
import { CAPABILITY_SNAPSHOT } from "./generated/capability-snapshot";
import { SnapshotCapabilityRegistry } from "./src/registry/snapshot";

const registry = new SnapshotCapabilityRegistry(CAPABILITY_SNAPSHOT);
const app = createServer(registry, {
  activityPersistence: "process-memory",
  runtime: { kind: "worker", endpoint: "/message" },
});

export default app;
