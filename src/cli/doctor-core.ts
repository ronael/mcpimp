import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join } from "node:path";
import { CAPABILITIES_DIR } from "../core/paths";
import { findListeningPid } from "../local/lifecycle";
import { UpstreamMcpGateway } from "../mcp/upstream";
import { FileSystemCapabilityRegistry } from "../registry/filesystem";

export type DoctorStatus = "pass" | "warning" | "error";

export interface DoctorCheck {
  name: "catalog" | "activity-log" | "port" | "upstream-environment";
  status: DoctorStatus;
  message: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  exitCode: number;
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
  if (!existing) {
    return { name: "activity-log", status: "error", message: `no writable parent for ${logDirectory}` };
  }

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

async function isMcpimpHealthy(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(1_000) });
    if (!response.ok) return false;
    const payload = (await response.json()) as { ok?: unknown; capabilities?: unknown };
    return payload.ok === true && typeof payload.capabilities === "number";
  } catch {
    return false;
  }
}

async function checkPort(port: number): Promise<DoctorCheck> {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return { name: "port", status: "error", message: `invalid port: ${port}` };
  }

  try {
    if ((await probePort(port)) === "available") {
      return { name: "port", status: "pass", message: `${port} is available` };
    }
  } catch (error) {
    return {
      name: "port",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  const pid = await findListeningPid(port);
  const owner = pid ? ` (PID ${pid})` : "";
  if (await isMcpimpHealthy(port)) {
    return { name: "port", status: "warning", message: `${port} is already serving MCPIMP${owner}` };
  }
  return { name: "port", status: "error", message: `${port} is occupied by another service${owner}` };
}

export async function runDoctor(root: string, port: number): Promise<DoctorReport> {
  const catalogPath = join(root, CAPABILITIES_DIR);
  let registry: FileSystemCapabilityRegistry | undefined;
  let catalogCheck: DoctorCheck;

  try {
    registry = await FileSystemCapabilityRegistry.scan(catalogPath);
    const count = registry.listCapabilities().length;
    catalogCheck = count > 0
      ? { name: "catalog", status: "pass", message: `${count} capabilities in ${catalogPath}` }
      : { name: "catalog", status: "warning", message: `no capability found in ${catalogPath}` };
  } catch (error) {
    catalogCheck = {
      name: "catalog",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
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

  const checks = [catalogCheck, await checkLogDirectory(join(root, "logs")), await checkPort(port), upstreamCheck];
  return { checks, exitCode: checks.some((check) => check.status === "error") ? 1 : 0 };
}

export function formatDoctorReport(report: DoctorReport): string {
  const marks: Record<DoctorStatus, string> = { pass: "✓", warning: "!", error: "✗" };
  const lines = report.checks.map((check) => `${marks[check.status]} ${check.name}: ${check.message}`);
  const counts = {
    pass: report.checks.filter((check) => check.status === "pass").length,
    warning: report.checks.filter((check) => check.status === "warning").length,
    error: report.checks.filter((check) => check.status === "error").length,
  };
  lines.push(`Doctor: ${counts.pass} passed, ${counts.warning} warning(s), ${counts.error} error(s)`);
  return lines.join("\n");
}
