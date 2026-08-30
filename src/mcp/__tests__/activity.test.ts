import { describe, expect, it } from "vitest";
import { activityClient, activityOutcome, activityParameters, activityTarget, activityUpstream, McpActivityLog } from "../activity";

describe("MCP activity log", () => {
  it("keeps the newest events within its bounded capacity", () => {
    const log = new McpActivityLog(2);
    for (const method of ["initialize", "tools/list", "resources/list"]) {
      log.record({ client: "test", method, transport: "http", status: "success", durationMs: 1 });
    }

    expect(log.list().map((event) => event.method)).toEqual(["resources/list", "tools/list"]);
  });

  it("filters events before applying the result limit", () => {
    const timestamps = [
      "2026-08-30T08:00:00.000Z",
      "2026-08-30T09:00:00.000Z",
      "2026-08-30T10:00:00.000Z",
      "2026-08-30T11:00:00.000Z",
    ];
    const log = new McpActivityLog(10, undefined, () => new Date(timestamps.shift()!));
    log.record({ client: "Claude 1.0", method: "tools/list", transport: "http", status: "success", durationMs: 1 });
    log.record({ client: "Codex 2.0", method: "tools/call", target: "search-capabilities", transport: "http", status: "error", durationMs: 2 });
    log.record({ client: "Codex 2.0", method: "tools/call", target: "load-capability", transport: "sse", status: "success", durationMs: 3 });
    log.record({ client: "Codex 2.0", method: "tools/call", target: "search-capabilities", transport: "http", status: "error", durationMs: 4 });

    expect(log.query({
      client: "Codex 2.0",
      method: "tools/call",
      tool: "search-capabilities",
      status: "error",
      transport: "http",
      from: "2026-08-30T08:30:00.000Z",
      to: "2026-08-30T11:00:00.000Z",
      limit: 1,
    })).toMatchObject([{ durationMs: 4 }]);
  });

  it("lists stable filter facets from the retained window", () => {
    const log = new McpActivityLog(10);
    log.record({ client: "Codex", method: "tools/call", target: "load-capability", transport: "http", status: "success", durationMs: 1 });
    log.record({ client: "Claude", method: "tools/list", transport: "sse", status: "error", durationMs: 1 });
    log.record({ client: "Codex", method: "tools/call", target: "search-capabilities", transport: "http", status: "success", durationMs: 1 });

    expect(log.facets()).toEqual({
      clients: ["Claude", "Codex"],
      methods: ["tools/call", "tools/list"],
      tools: ["load-capability", "search-capabilities"],
      statuses: ["error", "success"],
      transports: ["http", "sse"],
    });
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

  it("identifies namespaced upstream tools without inspecting their arguments", () => {
    expect(activityUpstream({
      method: "tools/call",
      params: { name: "nocodb.list-rows", arguments: { token: "private" } },
    })).toEqual({ capabilityId: "nocodb", tool: "list-rows" });
    expect(activityUpstream({ method: "tools/call", params: { name: "search-capabilities" } })).toBeUndefined();
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

  it("records progressive loading coordinates", () => {
    expect(activityParameters({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "load-capability",
        arguments: { id: "landing-page", path: "SKILL.md", heading: "Workflow" },
      },
    })).toEqual({ id: "landing-page", path: "SKILL.md", heading: "Workflow" });
  });

  it("keeps the bounded heading-ranking parameters", () => {
    expect(activityParameters({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "capability-info",
        arguments: {
          id: "landing-page",
          path: "SKILL.md",
          query: "premium conversion",
          headingLimit: 3,
          diagnostic: true,
          ignored: "hidden",
        },
      },
    })).toEqual({
      id: "landing-page",
      path: "SKILL.md",
      query: "premium conversion",
      headingLimit: 3,
      diagnostic: true,
    });
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
