import { serve } from "@hono/node-server";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { CAPABILITIES_DIR } from "./core/paths";
import { loadDotenv } from "./env/load-dotenv";
import type { StaticSiteProvider } from "./http/server";
import { createServer } from "./http/server";
import type { McpActivityEvent } from "./mcp/activity";
import { FileSystemCapabilityRegistry } from "./registry/filesystem";
import { ActivityFileWriter, activityFileOptionsFromEnv } from "./local/activity-file";
import { closeServer, startupErrorMessage } from "./local/lifecycle";

await loadDotenv();

const port = Number(process.env.PORT || 3901);
const root = resolve(process.env.MCPIMP_ROOT || process.cwd());
const registry = await FileSystemCapabilityRegistry.scan(join(root, CAPABILITIES_DIR));
const siteRoot = join(root, "site");
const activityFileOptions = activityFileOptionsFromEnv(root);
const activityWriter = await ActivityFileWriter.open({
  ...activityFileOptions,
  onError: (error) => console.error(`Could not write MCP activity log: ${error.message}`),
});

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function siteFileForPath(requestPath: string): string | undefined {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0] || "/");
  const normalizedPath = cleanPath.endsWith("/") ? `${cleanPath}index.html` : cleanPath;
  const relativePath = normalize(normalizedPath.replace(/^\/+/, ""));
  if (relativePath.startsWith("..") || relativePath.includes(`${sep}..${sep}`)) return undefined;

  const filePath = join(siteRoot, relativePath);
  if (filePath !== siteRoot && !filePath.startsWith(`${siteRoot}${sep}`)) return undefined;
  return filePath;
}

const staticSite: StaticSiteProvider = {
  async serve(requestPath) {
    const filePath = siteFileForPath(requestPath);
    if (!filePath) return undefined;

    const body = await readFile(filePath).catch(() => undefined);
    if (!body) return undefined;

    return new Response(body, {
      headers: {
        "content-type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
      },
    });
  },
};

function logActivity(event: McpActivityEvent) {
  activityWriter.append(event);
  const target = event.target ? ` ${event.target}` : "";
  console.log(`[MCP] ${event.status} ${event.client} ${event.method}${target} ${event.durationMs}ms`);
}

const app = createServer(registry, {
  staticSite,
  dashboardHome: true,
  onActivity: logActivity,
  activityPersistence: "process-memory+ndjson",
  runtime: {
    kind: "node",
    pid: process.pid,
    endpoint: `http://localhost:${port}/message`,
  },
});

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`Capability registry MCP listening on http://localhost:${port}`);
  console.log(`Scanned ${registry.listCapabilities().length} capabilities from ${join(root, CAPABILITIES_DIR)}`);
  console.log(`Activity log: ${activityFileOptions.path} (${activityFileOptions.maxBytes} bytes, ${activityFileOptions.maxArchives} archives)`);
});

let stopping = false;

server.once("error", (error) => {
  void (async () => {
    console.error(await startupErrorMessage(error, port));
    await activityWriter.close();
    process.exitCode = 1;
  })();
});

async function stop(signal: "SIGINT" | "SIGTERM") {
  if (stopping) return;
  stopping = true;
  console.log(`Stopping MCPIMP (${signal})…`);
  try {
    await closeServer(server);
    await activityWriter.close();
    console.log("MCPIMP stopped; activity log flushed.");
  } catch (error) {
    console.error(`MCPIMP shutdown failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
