import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "./registry";
import { createServer } from "./server";

const port = Number(process.env.PORT || 3901);
const root = resolve(process.env.CAPABILITIES_ROOT || ".");
const registry = await FileSystemCapabilityRegistry.scan(root);
const app = createServer(registry);

serve({ fetch: app.fetch, port });

console.log(`Capability registry MCP listening on http://localhost:${port}`);
