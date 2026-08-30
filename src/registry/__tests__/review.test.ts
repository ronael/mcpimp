import { describe, expect, it } from "vitest";
import { effectiveCapabilityReview, parseReviewRecord } from "../review";

const HASH = `sha256:${"a".repeat(64)}`;

describe("capability review", () => {
  it("requires a valid hash, timestamp and reviewer", () => {
    expect(() => parseReviewRecord(JSON.stringify({
      schemaVersion: 1,
      status: "reviewed",
      reviewedContentHash: "sha256:short",
      reviewedAt: "yesterday",
      reviewedBy: "",
    }), "example")).toThrow();
  });

  it("requires review again when upstream content changes", () => {
    const record = parseReviewRecord(JSON.stringify({
      schemaVersion: 1,
      status: "reviewed",
      reviewedContentHash: HASH,
      reviewedAt: "2026-08-30T00:00:00.000Z",
      reviewedBy: "reviewer",
    }), "example");

    expect(effectiveCapabilityReview(undefined, record)).toEqual({ status: "local" });
    expect(effectiveCapabilityReview({ contentHash: HASH }, record).status).toBe("reviewed");
    expect(effectiveCapabilityReview({ contentHash: `sha256:${"b".repeat(64)}` }, record).status)
      .toBe("review-required");
    expect(effectiveCapabilityReview({ contentHash: HASH }, undefined)).toEqual({ status: "unreviewed" });
  });
});
