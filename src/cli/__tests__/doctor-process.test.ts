import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import type { DoctorReport } from "../doctor-core";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(".");

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a test port"));
        return;
      }
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mcpimp-process-"));
  const capability = join(root, "catalog", "capabilities", "local", "fixture");
  await mkdir(capability, { recursive: true });
  await writeFile(join(capability, "SKILL.md"), [
    "---",
    "name: fixture",
    "description: Process-level doctor fixture.",
    "---",
    "",
    "# Fixture",
  ].join("\n"));
  return root;
}

async function waitForHealth(url: string, process: ChildProcess, output: () => string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`MCPIMP exited before health check:\n${output()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The child is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`Timed out waiting for MCPIMP:\n${output()}`);
}

async function stop(process: ChildProcess): Promise<number | null> {
  if (process.exitCode !== null) return process.exitCode;
  process.kill("SIGTERM");
  return new Promise((resolveExit) => process.once("exit", (code) => resolveExit(code)));
}

describe("doctor against the local process", () => {
  it("runs health, initialize, initialized and tools/list over a real socket", { timeout: 20_000 }, async () => {
    const root = await fixtureRoot();
    const port = await availablePort();
    const stdout: string[] = [];
    const stderr: string[] = [];
    const server = spawn(process.execPath, ["--import", "tsx", "src/local.ts"], {
      cwd: projectRoot,
      env: { ...process.env, MCPIMP_ROOT: root, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (chunk) => stdout.push(String(chunk)));
    server.stderr?.on("data", (chunk) => stderr.push(String(chunk)));
    const output = () => [...stdout, ...stderr].join("");

    try {
      await waitForHealth(`http://127.0.0.1:${port}/health`, server, output);
      const result = await execFileAsync("pnpm", ["--silent", "run", "doctor", "--", "--json"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          MCPIMP_ROOT: root,
          MCPIMP_URL: `http://127.0.0.1:${port}/message`,
          PORT: String(port),
        },
      });
      const report = JSON.parse(result.stdout) as DoctorReport;

      expect(report.exitCode).toBe(0);
      expect(report.mode).toBe("runtime");
      expect(report.runtime).toMatchObject({
        endpoint: `http://127.0.0.1:${port}/message`,
        capabilities: 1,
        pid: server.pid,
      });
      expect(report.runtime?.toolCount).toBeGreaterThan(0);
      expect(report.checks).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "reachable", status: "pass" }),
        expect.objectContaining({ name: "initialized", status: "pass" }),
        expect.objectContaining({ name: "tools-loaded", status: "pass" }),
        expect.objectContaining({ name: "catalog-freshness", status: "pass" }),
      ]));
    } finally {
      expect(await stop(server), output()).toBe(0);
    }
  });
});
