import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { loadDotenv } from "./env/load-dotenv";
import { createServer } from "./http/server";
import { FileSystemCapabilityRegistry } from "./registry/filesystem";

await loadDotenv();

const port = Number(process.env.PORT || 3901);
const root = resolve(process.env.CAPABILITIES_ROOT || "catalog/capabilities/skills");
const registry = await FileSystemCapabilityRegistry.scan(root);
const app = createServer(registry);

serve({ fetch: app.fetch, port });

console.log(`Capability registry MCP listening on http://localhost:${port}`);
