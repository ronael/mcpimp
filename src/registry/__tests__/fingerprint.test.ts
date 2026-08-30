import { describe, expect, it } from "vitest";
import { catalogFingerprint } from "../fingerprint";
import { FileSystemCapabilityRegistry } from "../filesystem";
import type { Capability } from "../types";

function capability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: "example",
    namespace: "local",
    slug: "example",
    name: "Example",
    description: "Example capability.",
    components: { skill: true, mcp: false },
    files: [],
    review: { status: "local" },
    ...overrides,
  };
}

describe("catalog fingerprint", () => {
  it("changes when local routing or effective review state changes", async () => {
    const baseline = FileSystemCapabilityRegistry.fromSnapshot([capability()]);
    const routed = FileSystemCapabilityRegistry.fromSnapshot([capability({
      routing: {
        schemaVersion: 1,
        role: "specialist",
        taskModes: ["review"],
        useWhen: ["exact review"],
        avoidWhen: [],
        conflictsWith: [],
        complements: [],
      },
    })]);
    const reviewed = FileSystemCapabilityRegistry.fromSnapshot([capability({
      review: {
        status: "reviewed",
        reviewedContentHash: `sha256:${"a".repeat(64)}`,
        reviewedAt: "2026-08-30T00:00:00.000Z",
        reviewedBy: "maintainer",
      },
    })]);

    const baselineHash = await catalogFingerprint(baseline);
    expect(await catalogFingerprint(routed)).not.toBe(baselineHash);
    expect(await catalogFingerprint(reviewed)).not.toBe(baselineHash);
  });
});
