import { describe, expect, it } from "vitest";
import { parseRoutingCard, validateRoutingReferences } from "../routing-card";
import type { Capability } from "../types";

function capability(id: string, references: Partial<NonNullable<Capability["routing"]>> = {}): Capability {
  return {
    id,
    namespace: "test",
    slug: id,
    name: id,
    description: id,
    components: { skill: true, mcp: false },
    files: [],
    routing: {
      schemaVersion: 1,
      role: "specialist",
      taskModes: ["create"],
      useWhen: [],
      avoidWhen: [],
      conflictsWith: [],
      complements: [],
      ...references,
    },
  };
}

describe("routing cards", () => {
  it("rejects unknown task modes", () => {
    expect(() => parseRoutingCard(JSON.stringify({
      schemaVersion: 1,
      role: "specialist",
      taskModes: ["invent"],
      useWhen: [],
      avoidWhen: [],
      conflictsWith: [],
      complements: [],
    }), "example")).toThrow("invalid taskMode");
  });

  it("rejects unknown and self references", () => {
    expect(() => validateRoutingReferences([
      capability("one", { complements: ["missing"] }),
    ])).toThrow('unknown capability "missing"');

    expect(() => validateRoutingReferences([
      capability("one", { conflictsWith: ["one"] }),
    ])).toThrow("cannot reference itself");
  });
});
