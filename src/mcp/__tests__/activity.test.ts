import { describe, expect, it } from "vitest";
import { activityClient, activityOutcome, activityParameters, activityTarget, McpActivityLog } from "../activity";

describe("MCP activity log", () => {
  it("keeps the newest events within its bounded capacity", () => {
    const log = new McpActivityLog(2);
    for (const method of ["initialize", "tools/list", "resources/list"]) {
      log.record({ client: "test", method, transport: "http", status: "success", durationMs: 1 });
    }

    expect(log.list().map((event) => event.method)).toEqual(["resources/list", "tools/list"]);
  });

  it("describes clients and targets without retaining arguments", () => {
    const initialize = {
      method: "initialize",
      params: { clientInfo: { name: "Codex", version: "1.2.3" } },
    };
    const call = {
      method: "tools/call",
      params: { name: "load-capability", arguments: { secret: "hidden" } },
    };

    expect(activityClient(initialize, "fallback")).toBe("Codex 1.2.3");
    expect(activityTarget(call)).toBe("load-capability");
  });

  it("keeps only the documented internal parameters", () => {
    const parameters = activityParameters({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "search-capabilities",
        arguments: { query: "observability", apiKey: "private", nested: { password: "hidden" } },
      },
    });

    expect(parameters).toEqual({ query: "observability" });
    expect(JSON.stringify(parameters)).not.toContain("private");
    expect(JSON.stringify(parameters)).not.toContain("hidden");
  });

  it("records only field names and types for upstream tool arguments", () => {
    const parameters = activityParameters({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "nocodb.list-rows",
        arguments: { table: "contacts", filter: "email=private@example.com" },
      },
    });

    expect(parameters).toEqual({ fields: [{ name: "table", type: "string" }, { name: "filter", type: "string" }] });
    expect(JSON.stringify(parameters)).not.toContain("private@example.com");
  });

  it("describes cancellation without retaining its free-text reason", () => {
    const parameters = activityParameters({
      jsonrpc: "2.0",
      method: "notifications/cancelled",
      params: { requestId: "request-42", reason: "Customer name and private context" },
    });

    expect(parameters).toEqual({ requestId: "request-42", hasReason: true });
    expect(JSON.stringify(parameters)).not.toContain("Customer");
  });

  it("summarizes returned items without retaining response text", () => {
    const outcome = activityOutcome(
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search-capabilities", arguments: {} } },
      {
        jsonrpc: "2.0",
        id: 1,
        result: { content: [{ type: "text", text: JSON.stringify([{ id: "one" }, { id: "two" }]) }] },
      },
    );

    expect(outcome).toMatchObject({
      status: "success",
      result: { kind: "tool-result", itemCount: 2, blockCount: 1, textCharacters: 27 },
    });
    expect(JSON.stringify(outcome)).not.toContain('"one"');
  });

  it("redacts credentials echoed by JSON RPC errors", () => {
    const outcome = activityOutcome(
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "nocodb.test", arguments: {} } },
      { jsonrpc: "2.0", id: 1, error: { code: -32000, message: "Bearer abc123 token=private failed" } },
    );

    expect(outcome.error?.message).toBe("Bearer [REDACTED] token=[REDACTED] failed");
  });
});
