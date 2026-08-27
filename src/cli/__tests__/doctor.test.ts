import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { formatDoctorReport, runDoctor } from "../doctor-core";

const originalUrl = process.env.DOCTOR_TEST_MCP_URL;
const originalToken = process.env.DOCTOR_TEST_MCP_TOKEN;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.DOCTOR_TEST_MCP_URL;
  else process.env.DOCTOR_TEST_MCP_URL = originalUrl;
  if (originalToken === undefined) delete process.env.DOCTOR_TEST_MCP_TOKEN;
  else process.env.DOCTOR_TEST_MCP_TOKEN = originalToken;
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
  it("reports catalog, log, port and missing environment without exposing values", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://secret.example/message";
    delete process.env.DOCTOR_TEST_MCP_TOKEN;

    const report = await runDoctor(root, 0);
    const output = formatDoctorReport(report);

    expect(report.exitCode).toBe(1);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "catalog", status: "pass" }),
        expect.objectContaining({ name: "activity-log", status: "pass" }),
        expect.objectContaining({ name: "port", status: "error", message: "invalid port: 0" }),
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

  it("reports enabled upstreams ready when every referenced variable exists", async () => {
    const root = await createProjectFixture();
    process.env.DOCTOR_TEST_MCP_URL = "https://secret.example/message";
    process.env.DOCTOR_TEST_MCP_TOKEN = "secret-token";

    const report = await runDoctor(root, -1);

    expect(report.checks).toContainEqual({
      name: "upstream-environment",
      status: "pass",
      message: "1 enabled upstream(s) ready",
    });
  });

  it("rejects an activity-log path occupied by a file", async () => {
    const root = await mkdtemp(join(tmpdir(), "mcpimp-doctor-log-file-"));
    await writeFile(join(root, "logs"), "not a directory");

    const report = await runDoctor(root, 0);

    expect(report.checks).toContainEqual({
      name: "activity-log",
      status: "error",
      message: `${join(root, "logs")} exists but is not a directory`,
    });
  });
});
