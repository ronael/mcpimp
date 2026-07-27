import { createServer } from "./src/server";
import { SnapshotCapabilityRegistry } from "./src/snapshot-registry";
import { CAPABILITY_SNAPSHOT } from "./src/capability-snapshot";

const registry = new SnapshotCapabilityRegistry(CAPABILITY_SNAPSHOT);
const app = createServer(registry);

export default app;
