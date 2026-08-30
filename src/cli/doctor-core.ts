import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join } from "node:path";
import { CAPABILITIES_DIR } from "../core/paths";
import { findListeningPid } from "../local/lifecycle";
import { UpstreamMcpGateway } from "../mcp/upstream";
import { catalogFingerprint } from "../registry/fingerprint";
import { FileSystemCapabilityRegistry } from "../registry/filesystem";

export type DoctorStatus = "pass" | "warning" | "error";
export type DoctorMode = "runtime" | "preflight";
export type DoctorCheckName =
  | "catalog"
  | "activity-log"
  | "port"
  | "upstream-environment"
  | "configured"
  | "reachable"
  | "initialized"
  | "tools-loaded"
  | "catalog-freshness";

export interface DoctorCheck {
  name: DoctorCheckName;
  status: DoctorStatus;
  message: string;
}

export interface DoctorRuntimeDetails {
  endpoint: string;
  healthEndpoint?: string;
  pid?: number;
  version?: string;
  capabilities?: number;
  toolCount?: number;
  tools?: string[];
  serverCatalogRevision?: string;
  localCatalogRevision?: string;
}

export interface DoctorReport {
  mode: DoctorMode;
  checkedAt: string;
  checks: DoctorCheck[];
  runtime?: DoctorRuntimeDetails;
  exitCode: number;
}

type DoctorFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface DoctorOptions {
  mode?: DoctorMode;
  endpoint?: string;
  timeoutMs?: number;
  fetch?: DoctorFetch;
}

interface HealthPayload {
  ok: true;
  capabilities: number;
  pid?: number;
  version?: string;
  catalogRevision?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function nearestExistingDirectory(path: string): Promise<string | undefined> {
  let candidate = path;
  while (true) {
    const metadata = await stat(candidate).catch(() => undefined);
    if (metadata?.isDirectory()) return candidate;
    const parent = dirname(candidate);
    if (parent === candidate) return undefined;
    candidate = parent;
  }
}

async function checkLogDirectory(logDirectory: string): Promise<DoctorCheck> {
  const target = await stat(logDirectory).catch(() => undefined);
  if (target && !target.isDirectory()) {
    return { name: "activity-log", status: "error", message: `${logDirectory} exists but is not a directory` };
  }
  const existing = await nearestExistingDirectory(logDirectory);
  if (!existing) return { name: "activity-log", status: "error", message: `no writable parent for ${logDirectory}` };
  try {
    await access(existing, constants.W_OK);
  } catch {
    return { name: "activity-log", status: "error", message: `${existing} is not writable` };
  }
  const detail = existing === logDirectory ? logDirectory : `${logDirectory} can be created from ${existing}`;
  return { name: "activity-log", status: "pass", message: detail };
}

async function probePort(port: number): Promise<"available" | "occupied"> {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.unref();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") resolve("occupied");
      else reject(error);
    });
    server.listen(port, () => server.close(() => resolve("available")));
  });
}

async function checkPort(port: number, fetcher: DoctorFetch, timeoutMs: number): Promise<DoctorCheck> {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return { name: "port", status: "error", message: `invalid port: ${port}` };
  }
  try {
    if ((await probePort(port)) === "available") return { name: "port", status: "pass", message: `${port} is available` };
  } catch (error) {
    return { name: "port", status: "error", message: errorMessage(error) };
  }
  const pid = await findListeningPid(port);
  const owner = pid ? ` (PID ${pid})` : "";
  try {
    const response = await fetcher(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.ok && parseHealthPayload(await response.json())) {
      return { name: "port", status: "warning", message: `${port} is already serving MCPIMP${owner}` };
    }
  } catch {
    // The listener is not a healthy MCPIMP instance.
  }
  return { name: "port", status: "error", message: `${port} is occupied by another service${owner}` };
}

function endpointHealthUrl(endpoint: URL): URL {
  const health = new URL(endpoint);
  health.pathname = "/health";
  health.search = "";
  health.hash = "";
  return health;
}

function parseHealthPayload(value: unknown): HealthPayload | undefined {
  if (!isRecord(value) || value.ok !== true || typeof value.capabilities !== "number") return undefined;
  return {
    ok: true,
    capabilities: value.capabilities,
    ...(typeof value.pid === "number" ? { pid: value.pid } : {}),
    ...(typeof value.version === "string" ? { version: value.version } : {}),
    ...(typeof value.catalogRevision === "string" ? { catalogRevision: value.catalogRevision } : {}),
  };
}

async function postMcp(fetcher: DoctorFetch, endpoint: URL, body: unknown, timeoutMs: number): Promise<Response> {
  return fetcher(endpoint, {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function checkRuntime(
  endpointValue: string,
  fetcher: DoctorFetch,
  timeoutMs: number,
  localCatalogRevision: string | undefined,
): Promise<{ checks: DoctorCheck[]; runtime: DoctorRuntimeDetails }> {
  const checks: DoctorCheck[] = [];
  const runtime: DoctorRuntimeDetails = { endpoint: endpointValue, localCatalogRevision };
  let endpoint: URL;
  try {
    endpoint = new URL(endpointValue);
    if (!/^https?:$/.test(endpoint.protocol)) throw new Error("endpoint must use http or https");
    checks.push({ name: "configured", status: "pass", message: `${endpoint} is a valid MCP endpoint` });
  } catch (error) {
    checks.push({ name: "configured", status: "error", message: errorMessage(error) });
    return { checks, runtime };
  }

  const healthEndpoint = endpointHealthUrl(endpoint);
  runtime.healthEndpoint = String(healthEndpoint);
  let health: HealthPayload;
  try {
    const response = await fetcher(healthEndpoint, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = parseHealthPayload(await response.json());
    if (!payload) throw new Error("response does not match the MCPIMP health contract");
    health = payload;
    runtime.pid = health.pid;
    runtime.version = health.version;
    runtime.capabilities = health.capabilities;
    runtime.serverCatalogRevision = health.catalogRevision;
    checks.push({
      name: "reachable",
      status: "pass",
      message: `${healthEndpoint} reports ${health.capabilities} capabilities${health.pid ? ` (PID ${health.pid})` : ""}`,
    });
  } catch (error) {
    checks.push({ name: "reachable", status: "error", message: `${healthEndpoint} unavailable: ${errorMessage(error)}` });
    return { checks, runtime };
  }

  if (!health.catalogRevision) {
    checks.push({ name: "catalog-freshness", status: "warning", message: "running server does not expose a catalog revision" });
  } else if (localCatalogRevision && health.catalogRevision !== localCatalogRevision) {
    checks.push({ name: "catalog-freshness", status: "warning", message: "running server catalog differs from catalog on disk" });
  } else {
    checks.push({ name: "catalog-freshness", status: "pass", message: "running server catalog matches catalog on disk" });
  }

  try {
    const response = await postMcp(fetcher, endpoint, {
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "mcpimp-doctor", version: "1.0.0" },
      },
    }, timeoutMs);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isRecord(payload.result)
      || typeof payload.result.protocolVersion !== "string" || !isRecord(payload.result.serverInfo)) {
      const rpcError = isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string"
        ? `: ${payload.error.message}` : "";
      throw new Error(`invalid initialize response${rpcError}`);
    }
    checks.push({ name: "initialized", status: "pass", message: `MCP ${payload.result.protocolVersion} initialized` });
  } catch (error) {
    checks.push({ name: "initialized", status: "error", message: errorMessage(error) });
    return { checks, runtime };
  }

  try {
    const notification = await postMcp(fetcher, endpoint, {
      jsonrpc: "2.0", method: "notifications/initialized",
    }, timeoutMs);
    if (!notification.ok) throw new Error(`notifications/initialized returned HTTP ${notification.status}`);
    const response = await postMcp(fetcher, endpoint, {
      jsonrpc: "2.0", id: 2, method: "tools/list", params: {},
    }, timeoutMs);
    if (!response.ok) throw new Error(`tools/list returned HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isRecord(payload.result) || !Array.isArray(payload.result.tools)) {
      throw new Error("invalid tools/list response");
    }
    const tools = payload.result.tools.flatMap((tool) => isRecord(tool) && typeof tool.name === "string" ? [tool.name] : []);
    if (tools.length === 0) throw new Error("tools/list returned no callable tools");
    runtime.tools = tools;
    runtime.toolCount = tools.length;
    checks.push({ name: "tools-loaded", status: "pass", message: `${tools.length} tool(s) listed by the doctor session` });
  } catch (error) {
    checks.push({ name: "tools-loaded", status: "error", message: errorMessage(error) });
  }
  return { checks, runtime };
}

export async function runDoctor(root: string, port: number, options: DoctorOptions = {}): Promise<DoctorReport> {
  const mode = options.mode || "runtime";
  const catalogPath = join(root, CAPABILITIES_DIR);
  let registry: FileSystemCapabilityRegistry | undefined;
  let localCatalogRevision: string | undefined;
  let catalogCheck: DoctorCheck;
  try {
    registry = await FileSystemCapabilityRegistry.scan(catalogPath);
    const count = registry.listCapabilities().length;
    localCatalogRevision = await catalogFingerprint(registry);
    catalogCheck = count > 0
      ? { name: "catalog", status: "pass", message: `${count} capabilities in ${catalogPath}` }
      : { name: "catalog", status: "warning", message: `no capability found in ${catalogPath}` };
  } catch (error) {
    catalogCheck = { name: "catalog", status: "error", message: errorMessage(error) };
  }

  let upstreamCheck: DoctorCheck;
  if (!registry) {
    upstreamCheck = { name: "upstream-environment", status: "warning", message: "not checked because catalog failed" };
  } else {
    const upstreams = new UpstreamMcpGateway(registry).listUpstreams();
    const enabled = upstreams.filter((upstream) => upstream.enabled);
    const missing = [...new Set(enabled.flatMap((upstream) => upstream.missingEnv))].sort();
    upstreamCheck = missing.length > 0
      ? { name: "upstream-environment", status: "error", message: `missing ${missing.join(", ")}` }
      : { name: "upstream-environment", status: "pass", message: `${enabled.length} enabled upstream(s) ready` };
  }

  const checks: DoctorCheck[] = [catalogCheck, await checkLogDirectory(join(root, "logs"))];
  let runtime: DoctorRuntimeDetails | undefined;
  if (mode === "preflight") {
    checks.push(await checkPort(port, options.fetch || fetch, options.timeoutMs || 2_000));
  } else {
    const endpoint = options.endpoint || `http://localhost:${port}/message`;
    const result = await checkRuntime(endpoint, options.fetch || fetch, options.timeoutMs || 2_000, localCatalogRevision);
    checks.push(...result.checks);
    runtime = result.runtime;
  }
  checks.push(upstreamCheck);
  return {
    mode,
    checkedAt: new Date().toISOString(),
    checks,
    ...(runtime ? { runtime } : {}),
    exitCode: checks.some((check) => check.status === "error") ? 1 : 0,
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const marks: Record<DoctorStatus, string> = { pass: "✓", warning: "!", error: "✗" };
  const lines = [`MCPIMP doctor (${report.mode})`];
  lines.push(...report.checks.map((check) => `${marks[check.status]} ${check.name}: ${check.message}`));
  const counts = {
    pass: report.checks.filter((check) => check.status === "pass").length,
    warning: report.checks.filter((check) => check.status === "warning").length,
    error: report.checks.filter((check) => check.status === "error").length,
  };
  lines.push(`Doctor: ${counts.pass} passed, ${counts.warning} warning(s), ${counts.error} error(s)`);
  return lines.join("\n");
}
