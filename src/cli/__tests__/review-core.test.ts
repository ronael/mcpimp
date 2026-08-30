import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { approveCapabilityReview, listCapabilityReviews } from "../review-core";

const HASH = `sha256:${"a".repeat(64)}`;
let root: string;

async function writeImportedCapability(contentHash = HASH): Promise<void> {
  const capabilityRoot = join(root, "catalog/capabilities/demo/imported");
  await mkdir(join(capabilityRoot, "upstream"), { recursive: true });
  await mkdir(join(capabilityRoot, "overrides"), { recursive: true });
  await writeFile(
    join(capabilityRoot, "upstream/SKILL.md"),
    "---\nname: Imported capability\ndescription: Review fixture.\n---\n\n# Imported",
    "utf-8",
  );
  await writeFile(
    join(capabilityRoot, "SOURCE.json"),
    `${JSON.stringify({
      type: "github",
      sourceId: "demo-source",
      repository: "acme/imported",
      path: "skills/imported",
      namespace: "demo",
      slug: "imported",
      capability: "demo-imported",
      contentHash,
      update: "review",
      files: [],
    }, null, 2)}\n`,
    "utf-8",
  );
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "mcpimp-review-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("capability review workflow", () => {
  it("lists imported capabilities that still require a local review", async () => {
    await writeImportedCapability();

    await expect(listCapabilityReviews(root)).resolves.toEqual([
      expect.objectContaining({
        id: "demo-imported",
        name: "Imported capability",
        sourceId: "demo-source",
        contentHash: HASH,
        status: "unreviewed",
      }),
    ]);
  });

  it("writes an attestation for the exact current content hash", async () => {
    await writeImportedCapability();

    const result = await approveCapabilityReview(
      root,
      "demo-imported",
      "Ronael",
      new Date("2026-08-31T10:00:00.000Z"),
    );

    expect(result).toMatchObject({
      id: "demo-imported",
      status: "reviewed",
      reviewedContentHash: HASH,
      reviewedAt: "2026-08-31T10:00:00.000Z",
      reviewedBy: "Ronael",
    });
    await expect(
      readFile(join(root, "catalog/capabilities/demo/imported/REVIEW.json"), "utf-8"),
    ).resolves.toContain(`"reviewedContentHash": "${HASH}"`);
    await expect(listCapabilityReviews(root)).resolves.toEqual([]);
  });

  it("refuses to review local content or an unknown capability", async () => {
    const localRoot = join(root, "catalog/capabilities/local/local-only");
    await mkdir(localRoot, { recursive: true });
    await writeFile(join(localRoot, "SKILL.md"), "---\nname: Local only\n---\n", "utf-8");

    await expect(approveCapabilityReview(root, "local-only", "Ronael")).rejects.toThrow(
      "Local capabilities do not require an upstream review",
    );
    await expect(approveCapabilityReview(root, "missing", "Ronael")).rejects.toThrow(
      "Capability not found",
    );
  });
});
