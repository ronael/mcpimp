import type { CapabilityOrigin, CapabilityReview, CapabilityReviewRecord } from "./types";

export const REVIEW_FILE = "REVIEW.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseReviewRecord(text: string, capabilityId: string): CapabilityReviewRecord {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`Invalid ${REVIEW_FILE} for ${capabilityId}`);
  }

  if (!isRecord(value) || value.schemaVersion !== 1 || value.status !== "reviewed") {
    throw new Error(`${REVIEW_FILE} for ${capabilityId} requires schemaVersion 1 and status "reviewed"`);
  }
  if (typeof value.reviewedContentHash !== "string" || !/^sha256:[a-f0-9]{64}$/i.test(value.reviewedContentHash)) {
    throw new Error(`${REVIEW_FILE} for ${capabilityId} requires a valid reviewedContentHash`);
  }
  if (typeof value.reviewedAt !== "string" || Number.isNaN(Date.parse(value.reviewedAt))) {
    throw new Error(`${REVIEW_FILE} for ${capabilityId} requires a valid reviewedAt timestamp`);
  }
  if (typeof value.reviewedBy !== "string" || value.reviewedBy.trim() === "") {
    throw new Error(`${REVIEW_FILE} for ${capabilityId} requires a non-empty reviewedBy`);
  }

  return {
    schemaVersion: 1,
    status: "reviewed",
    reviewedContentHash: value.reviewedContentHash.toLowerCase(),
    reviewedAt: new Date(value.reviewedAt).toISOString(),
    reviewedBy: value.reviewedBy.trim(),
  };
}

export function effectiveCapabilityReview(
  origin: Pick<CapabilityOrigin, "contentHash"> | undefined,
  record: CapabilityReviewRecord | undefined,
): CapabilityReview {
  if (!origin) return { status: "local" };
  if (!record) return { status: "unreviewed" };

  const details = {
    reviewedContentHash: record.reviewedContentHash,
    reviewedAt: record.reviewedAt,
    reviewedBy: record.reviewedBy,
  };
  return origin.contentHash?.toLowerCase() === record.reviewedContentHash
    ? { status: "reviewed", ...details }
    : { status: "review-required", ...details };
}
