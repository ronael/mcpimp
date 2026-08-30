import { describe, expect, it } from "vitest";
import { criticalRoutingFailures, evaluateRouting } from "../routing-evaluation";
import type { CapabilityResolution } from "../routing";

function resolution(primaryId: string, supportingIds: string[] = []): CapabilityResolution {
  return {
    primary: { id: primaryId, reviewStatus: "local", reasonCodes: [], entrypoints: [{ path: "SKILL.md", characters: 20 }] },
    supporting: supportingIds.map((id) => ({ id, reviewStatus: "local", reasonCodes: [], entrypoints: [] })),
    conflicts: [],
    budget: { unit: "characters", maximum: 1000, estimated: 20 },
    confidence: "high",
  };
}

describe("routing evaluation", () => {
  it("fails critical cases with an unexpected supporting capability", () => {
    const report = evaluateRouting([{
      id: "case",
      task: "test",
      expectedPrimaryId: "primary",
      allowedSupportingIds: ["allowed"],
      forbiddenCapabilityIds: ["forbidden"],
      critical: true,
    }], () => resolution("primary", ["forbidden"]));

    expect(report.summary.passRate).toBe(0);
    expect(criticalRoutingFailures(report)).toHaveLength(1);
  });
});
