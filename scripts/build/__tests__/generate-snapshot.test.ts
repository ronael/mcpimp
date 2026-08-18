import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CAPABILITIES_DIR, CAPABILITY_SNAPSHOT_FILE, SOURCES_DIR } from "../../../src/core/paths";
import { loadSourceDefinitions } from "../../../src/ingestion/definitions";
import { FileSystemCapabilityRegistry } from "../../../src/registry/filesystem";
import { generateSnapshot } from "../generate-snapshot";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "mcpimp-root-"));

  await mkdir(join(root, CAPABILITIES_DIR, "local", "crm-connector"), { recursive: true });
  await writeFile(
    join(root, CAPABILITIES_DIR, "local", "crm-connector", "mcp.json"),
    JSON.stringify(
      { type: "mcp", transport: "streamable-http", url: "https://example.com/mcp", name: "CRM Connector" },
      null,
      2,
    ),
    "utf-8",
  );

  await mkdir(join(root, SOURCES_DIR), { recursive: true });
  await writeFile(
    join(root, SOURCES_DIR, "demo.json"),
    JSON.stringify({ id: "demo", type: "github", repository: "acme/demo" }, null, 2),
    "utf-8",
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("MCPIMP_ROOT-relative path resolution", () => {
  it("reads capabilities and sources from, and writes the snapshot under, the same root", async () => {
    // The root is a temp dir distinct from the process working directory: every
    // MCPIMP path must resolve from this root, never from process.cwd().
    const snapshot = await generateSnapshot(root);

    expect(snapshot.count).toBe(1);
    expect(snapshot.outFile).toBe(join(root, CAPABILITY_SNAPSHOT_FILE));

    const written = await readFile(snapshot.outFile, "utf-8");
    expect(written).toContain('"id": "crm-connector"');

    const sources = await loadSourceDefinitions(root);
    expect(sources.map((source) => source.id)).toEqual(["demo"]);

    const registry = await FileSystemCapabilityRegistry.scan(join(root, CAPABILITIES_DIR));
    expect(registry.getCapability("crm-connector")).toBeDefined();
  });
});
