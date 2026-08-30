import { mkdtemp, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { ActivityFileWriter, activityFileOptionsFromEnv } from "../activity-file";
import type { McpActivityEvent } from "../../mcp/activity";

function event(id: string): McpActivityEvent {
  return {
    id,
    timestamp: "2026-08-30T10:00:00.000Z",
    client: "Codex",
    method: "tools/call",
    target: "search-capabilities",
    transport: "http",
    status: "success",
    durationMs: 1,
  };
}

describe("rotating activity file", () => {
  it("rotates atomically and retains only the configured archive count", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mcpimp-activity-"));
    const path = join(directory, "mcpimp.ndjson");
    const lineBytes = Buffer.byteLength(`${JSON.stringify(event("one"))}\n`);
    const writer = await ActivityFileWriter.open({ path, maxBytes: lineBytes + 5, maxArchives: 2 });

    for (const id of ["one", "two", "three", "four"]) writer.append(event(id));
    await writer.close();

    const current = JSON.parse((await readFile(path, "utf8")).trim());
    const firstArchive = JSON.parse((await readFile(`${path}.1`, "utf8")).trim());
    const secondArchive = JSON.parse((await readFile(`${path}.2`, "utf8")).trim());
    expect([current.id, firstArchive.id, secondArchive.id]).toEqual(["four", "three", "two"]);
    await expect(stat(`${path}.3`)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("supports a bounded current file without retained archives", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mcpimp-activity-"));
    const path = join(directory, "mcpimp.ndjson");
    const lineBytes = Buffer.byteLength(`${JSON.stringify(event("one"))}\n`);
    const writer = await ActivityFileWriter.open({ path, maxBytes: lineBytes + 5, maxArchives: 0 });

    writer.append(event("one"));
    writer.append(event("two"));
    await writer.close();

    expect(JSON.parse((await readFile(path, "utf8")).trim()).id).toBe("two");
    await expect(stat(`${path}.1`)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("parses explicit file limits and rejects unsafe values", () => {
    expect(activityFileOptionsFromEnv("/repo", {
      MCPIMP_ACTIVITY_MAX_BYTES: "2048",
      MCPIMP_ACTIVITY_MAX_ARCHIVES: "3",
    })).toEqual({
      path: "/repo/logs/mcpimp.ndjson",
      maxBytes: 2048,
      maxArchives: 3,
    });

    expect(() => activityFileOptionsFromEnv("/repo", { MCPIMP_ACTIVITY_MAX_BYTES: "0" }))
      .toThrow("MCPIMP_ACTIVITY_MAX_BYTES");
    expect(() => activityFileOptionsFromEnv("/repo", { MCPIMP_ACTIVITY_MAX_ARCHIVES: "-1" }))
      .toThrow("MCPIMP_ACTIVITY_MAX_ARCHIVES");
  });
});
