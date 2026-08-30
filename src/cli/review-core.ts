import { rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CAPABILITIES_DIR } from "../core/paths";
import { FileSystemCapabilityRegistry } from "../registry/filesystem";
import { REVIEW_FILE } from "../registry/review";
import type { CapabilityReviewRecord, CapabilityReviewStatus } from "../registry/types";

export interface CapabilityReviewQueueEntry {
  id: string;
  name: string;
  sourceId: string;
  contentHash: string;
  reviewedContentHash?: string;
  status: Exclude<CapabilityReviewStatus, "local" | "reviewed">;
  lastSyncedAt?: string;
}

async function registryFor(root: string): Promise<FileSystemCapabilityRegistry> {
  return FileSystemCapabilityRegistry.scan(join(root, CAPABILITIES_DIR));
}

export async function listCapabilityReviews(root: string): Promise<CapabilityReviewQueueEntry[]> {
  const registry = await registryFor(root);

  return registry
    .listCapabilities()
    .filter((capability) => capability.origin && capability.review?.status !== "reviewed")
    .map((capability) => ({
      id: capability.id,
      name: capability.name,
      sourceId: capability.origin!.sourceId,
      contentHash: capability.origin!.contentHash || "",
      reviewedContentHash: capability.review?.reviewedContentHash,
      status: capability.review?.status === "review-required" ? "review-required" as const : "unreviewed" as const,
      lastSyncedAt: capability.origin!.lastSyncedAt,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function approveCapabilityReview(
  root: string,
  capabilityId: string,
  reviewer: string,
  now = new Date(),
): Promise<CapabilityReviewRecord & { id: string }> {
  const registry = await registryFor(root);
  const capability = registry.getCapability(capabilityId);
  if (!capability) throw new Error(`Capability not found: ${capabilityId}`);
  if (!capability.origin) throw new Error("Local capabilities do not require an upstream review");
  if (!capability.rootPath) throw new Error(`Capability path is unavailable: ${capabilityId}`);
  if (!capability.origin.contentHash || !/^sha256:[a-f0-9]{64}$/i.test(capability.origin.contentHash)) {
    throw new Error(`Capability ${capabilityId} has no reviewable content hash`);
  }
  const reviewedBy = reviewer.trim();
  if (!reviewedBy) throw new Error("Reviewer must not be empty");

  const record: CapabilityReviewRecord = {
    schemaVersion: 1,
    status: "reviewed",
    reviewedContentHash: capability.origin.contentHash.toLowerCase(),
    reviewedAt: now.toISOString(),
    reviewedBy,
  };
  const target = join(capability.rootPath, REVIEW_FILE);
  const staging = `${target}.${process.pid}.tmp`;
  await writeFile(staging, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
  await rename(staging, target);

  return { id: capability.id, ...record };
}
