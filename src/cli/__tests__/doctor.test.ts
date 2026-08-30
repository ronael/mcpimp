import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { formatDoctorReport, runDoctor } from "../doctor-core";

const originalUrl = process.env.DOCTOR_TEST_MCP_URL;
const originalToken = process.env.DOCTOR_TEST_MCP_TOKEN;
const originalActivityMaxBytes = process.env.MCPIMP_ACTIVITY_MAX_BYTES;
const originalActivityMaxArchives = process.env.MCPIMP_ACTIVITY_MAX_ARCHIVES;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.DOCTOR_TEST_MCP_URL;
  else process.env.DOCTOR_TEST_MCP_URL = originalUrl;
  if (originalToken === undefined) delete process.env.DOCTOR_TEST_MCP_TOKEN;
  else process.env.DOCTOR_TEST_MCP_TOKEN = originalToken;
  if (originalActivityMaxBytes === undefined) delete process.env.MCPIMP_ACTIVITY_MAX_BYTES;
  else process.env.MCPIMP_ACTIVITY_MAX_BYTES = originalActivityMaxBytes;
  if (originalActivityMaxArchives === undefined) delete process.env.MCPIMP_ACTIVITY_MAX_ARCHIVES;
  else process.env.MCPIMP_ACTIVITY_MAX_ARCHIVES = originalActivityMaxArchives;
});

async function createProjectFixture() {
  const root = await mkdtemp(join(tmpdir(), "mcpimp-doctor-"));
  const capability = join(root, "catalog", "capabilities", "local", "fixture");
  await mkdir(capability, { recursive: true });
  await mkdir(join(root, "logs"));
  await writeFile(
    join(capability, "mcp.json"),
    JSON.stringify({
      type: "mcp-remote",
      url: "env:DOCTOR_TEST_MCP_URL",
      headers: { authorization: "Bearer env:DOCTOR_TEST_MCP_TOKEN" },
      name: "Fixture",
    }),
  );
  return root;
}

describe("doctor", () => {
  it("fails runtime diagnostics when MCPIMP is not reachable without exposing environment values", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://secret.example/message";
    delete process.env.DOCTOR_TEST_MCP_TOKEN;

    const report = await runDoctor(root, 3901, {
      endpoint: "http://127.0.0.1:3901/message",
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    const output = formatDoctorReport(report);

    expect(report.exitCode).toBe(1);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "catalog", status: "pass" }),
        expect.objectContaining({ name: "activity-log", status: "pass" }),
        expect.objectContaining({ name: "configured", status: "pass" }),
        expect.objectContaining({ name: "reachable", status: "error" }),
        expect.objectContaining({
          name: "upstream-environment",
          status: "error",
          message: "missing DOCTOR_TEST_MCP_TOKEN",
        }),
      ]),
    );
    expect(output).not.toContain("https://secret.example");
    expect(output).not.toContain("Bearer");
  });

  it("probes the legacy handshake and MCP 2026 discovery in order", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://upstream.example/message";
    process.env.DOCTOR_TEST_MCP_TOKEN = "secret-token";
    const methods: string[] = [];

    const report = await runDoctor(root, 3901, {
      endpoint: "http://127.0.0.1:3901/message",
      fetch: async (input, init) => {
        const url = String(input);
        if (url.endsWith("/health")) {
          return Response.json({
            ok: true,
            capabilities: 1,
            pid: 4242,
            version: "1.0.0",
            endpoint: "/message",
          });
        }
        const body = JSON.parse(String(init?.body));
        methods.push(body.method);
        if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
        if (body.method === "initialize") {
          return Response.json({
            jsonrpc: "2.0",
            id: 1,
            result: {
              protocolVersion: "2025-03-26",
              serverInfo: { name: "personal-capability-registry", version: "1.0.0" },
            },
          });
        }
        if (body.method === "server/discover") {
          return Response.json({
            jsonrpc: "2.0",
            id: 3,
            result: {
              resultType: "complete",
              supportedVersions: ["2026-07-28", "2025-11-25"],
            },
          });
        }
        return Response.json({
          jsonrpc: "2.0",
          id: 2,
          result: { tools: [{ name: "list-capabilities" }, { name: "search-capabilities" }] },
        });
      },
    });

    expect(methods).toEqual(["initialize", "notifications/initialized", "tools/list", "server/discover"]);
    expect(report.exitCode).toBe(0);
    expect(report.runtime).toMatchObject({
      endpoint: "http://127.0.0.1:3901/message",
      pid: 4242,
      capabilities: 1,
      toolCount: 2,
      tools: ["list-capabilities", "search-capabilities"],
      supportedProtocols: ["2026-07-28", "2025-11-25"],
    });
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "initialized", status: "pass" }),
      expect.objectContaining({ name: "tools-loaded", status: "pass" }),
      expect.objectContaining({ name: "modern-discovery", status: "pass" }),
    ]));
  });

  it("fails when initialize returns a JSON-RPC error", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://upstream.example/message";
    process.env.DOCTOR_TEST_MCP_TOKEN = "secret-token";

    const report = await runDoctor(root, 3901, {
      fetch: async (input) => String(input).endsWith("/health")
        ? Response.json({ ok: true, capabilities: 1 })
        : Response.json({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "broken" } }),
    });

    expect(report.exitCode).toBe(1);
    expect(report.checks).toContainEqual(expect.objectContaining({ name: "initialized", status: "error" }));
    expect(report.checks.some((check) => check.name === "tools-loaded")).toBe(false);
  });

  it("rejects a reachable service that does not implement the MCPIMP health contract", async () => {
    const root = await createProjectFixture();

    const report = await runDoctor(root, 3901, {
      fetch: async () => Response.json({ status: "fine" }),
    });

    expect(report.exitCode).toBe(1);
    expect(report.checks).toContainEqual(expect.objectContaining({
      name: "reachable",
      status: "error",
      message: expect.stringContaining("health contract"),
    }));
  });

  it("fails when the initialized server exposes no callable tools", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://upstream.example/message";
    process.env.DOCTOR_TEST_MCP_TOKEN = "secret-token";

    const report = await runDoctor(root, 3901, {
      fetch: async (input, init) => {
        if (String(input).endsWith("/health")) return Response.json({ ok: true, capabilities: 1 });
        const body = JSON.parse(String(init?.body));
        if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
        if (body.method === "initialize") {
          return Response.json({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-03-26", serverInfo: {} } });
        }
        if (body.method === "server/discover") {
          return Response.json({
            jsonrpc: "2.0",
            id: 3,
            result: { resultType: "complete", supportedVersions: ["2026-07-28"] },
          });
        }
        return Response.json({ jsonrpc: "2.0", id: 2, result: { tools: [] } });
      },
    });

    expect(report.exitCode).toBe(1);
    expect(report.checks).toContainEqual(expect.objectContaining({
      name: "tools-loaded",
      status: "error",
      message: "tools/list returned no callable tools",
    }));
  });

  it("signals a stale running catalog without failing an otherwise healthy runtime", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://upstream.example/message";
    process.env.DOCTOR_TEST_MCP_TOKEN = "secret-token";

    const report = await runDoctor(root, 3901, {
      fetch: async (input, init) => {
        if (String(input).endsWith("/health")) {
          return Response.json({ ok: true, capabilities: 1, catalogRevision: "sha256:stale" });
        }
        const body = JSON.parse(String(init?.body));
        if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
        if (body.method === "initialize") {
          return Response.json({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-03-26", serverInfo: {} } });
        }
        if (body.method === "server/discover") {
          return Response.json({
            jsonrpc: "2.0",
            id: 3,
            result: { resultType: "complete", supportedVersions: ["2026-07-28"] },
          });
        }
        return Response.json({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "list-capabilities" }] } });
      },
    });

    expect(report.exitCode).toBe(0);
    expect(report.checks).toContainEqual(expect.objectContaining({ name: "catalog-freshness", status: "warning" }));
  });

  it("keeps the former port availability check in preflight mode", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://upstream.example/message";
    process.env.DOCTOR_TEST_MCP_TOKEN = "secret-token";

    const report = await runDoctor(root, 0, { mode: "preflight" });

    expect(report.mode).toBe("preflight");
    expect(report.checks).toContainEqual({ name: "port", status: "error", message: "invalid port: 0" });
    expect(report.checks.some((check) => check.name === "reachable")).toBe(false);
  });

  it("reports enabled upstreams ready when every referenced variable exists", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://secret.example/message";
    process.env.DOCTOR_TEST_MCP_TOKEN = "secret-token";

    const report = await runDoctor(root, -1, { mode: "preflight" });

    expect(report.checks).toContainEqual({
      name: "upstream-environment",
      status: "pass",
      message: "1 enabled upstream(s) ready",
    });
  });

  it("rejects an activity-log path occupied by a file", async () => {
    const root = await mkdtemp(join(tmpdir(), "mcpimp-doctor-log-file-"));
    await writeFile(join(root, "logs"), "not a directory");

    const report = await runDoctor(root, 0, { mode: "preflight" });

    expect(report.checks).toContainEqual({
      name: "activity-log",
      status: "error",
      message: `${join(root, "logs")} exists but is not a directory`,
    });
  });

  it("rejects invalid activity rotation settings during preflight", async () => {
    const root = await createProjectFixture();
    process.env.MCPIMP_ACTIVITY_MAX_BYTES = "unbounded";

    const report = await runDoctor(root, 0, { mode: "preflight" });

    expect(report.checks).toContainEqual({
      name: "activity-log",
      status: "error",
      message: "MCPIMP_ACTIVITY_MAX_BYTES must be an integer greater than or equal to 1",
    });
  });
});
