import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ClosableServer {
  close(callback: (error?: Error) => void): unknown;
  closeAllConnections?: () => void;
}

export function isAddressInUse(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === "EADDRINUSE";
}

export async function findListeningPid(port: number): Promise<number | undefined> {
  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
    const pid = Number(stdout.trim().split(/\s+/)[0]);
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

export async function startupErrorMessage(
  error: unknown,
  port: number,
  findPid: (port: number) => Promise<number | undefined> = findListeningPid,
): Promise<string> {
  if (!isAddressInUse(error)) {
    const message = error instanceof Error ? error.message : String(error);
    return `MCPIMP could not start: ${message}`;
  }

  const pid = await findPid(port);
  const owner = pid ? ` (PID ${pid})` : "";
  return [
    `MCPIMP could not start: port ${port} is already in use${owner}.`,
    `Check the listener: lsof -nP -iTCP:${port} -sTCP:LISTEN`,
    `If MCPIMP is already running, use http://localhost:${port}/health.`,
    `Otherwise choose another port: PORT=${port + 1} pnpm dev`,
  ].join("\n");
}

export async function closeServer(server: ClosableServer, timeoutMs = 5_000): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") reject(error);
      else resolve();
    };

    const timer = setTimeout(() => {
      server.closeAllConnections?.();
      finish();
    }, timeoutMs);
    timer.unref();

    try {
      server.close(finish);
    } catch (error) {
      finish(error as Error);
    }
  });
}
