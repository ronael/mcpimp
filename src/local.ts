import { serve } from "@hono/node-server";
import { join, resolve } from "node:path";
import { CAPABILITIES_DIR } from "./core/paths";
import { loadDotenv } from "./env/load-dotenv";
import { createServer } from "./http/server";
import { FileSystemCapabilityRegistry } from "./registry/filesystem";

await loadDotenv();

const port = Number(process.env.PORT || 3901);
const root = resolve(process.env.MCPIMP_ROOT || process.cwd());
const registry = await FileSystemCapabilityRegistry.scan(join(root, CAPABILITIES_DIR));
const app = createServer(registry);

serve({ fetch: app.fetch, port });

console.log(`Capability registry MCP listening on http://localhost:${port}`);
console.log(`Scanned ${registry.listCapabilities().length} capabilities from ${join(root, CAPABILITIES_DIR)}`);
