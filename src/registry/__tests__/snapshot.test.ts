import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../filesystem";
import { SnapshotCapabilityRegistry } from "../snapshot";

const CATALOG_ROOT = resolve("catalog/capabilities");

/**
 * The Cloudflare Worker has no filesystem: it serves the build-time snapshot.
 * It must expose exactly what the on-disk catalog does, so the two registries
 * are kept interchangeable.
 *
 * The canonical id list below locks the public API surface for the
 * `skills/ → <namespace>/<slug>/` migration: a move on disk must never change
 * an id or drop a capability. Adding a capability is fine; renaming one here
 * is an explicit, deliberate API change.
 */
const PUBLIC_IDS = [
  "elaya-design-landing-page-design",
  "frontend-architecture",
  "hallmark",
  "landing-page",
  "matt-pocock-codebase-design",
  "matt-pocock-domain-modeling",
  "matt-pocock-grilling",
  "matt-pocock-improve-codebase-architecture",
  "nocodb",
  "taste-skill",
  "taste-skill-imagegen-frontend-web",
  "taste-skill-minimalist-skill",
  "taste-skill-redesign-skill",
  "taste-skill-soft-skill",
  "ui-component-resources",
  "ui-skills-baseline-ui",
  "ui-skills-create-design-md",
  "ui-skills-fixing-accessibility",
  "ui-skills-fixing-motion-performance",
  "ui-skills-improve-ui",
  "ui-ux-pro-max",
];

describe("SnapshotCapabilityRegistry (Cloudflare Worker)", () => {
  it("serves every capability without touching the filesystem", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const snapshot = new SnapshotCapabilityRegistry(registry.listCapabilities());

    expect(snapshot.listCapabilities().map((capability) => capability.id).sort()).toEqual(
      registry.listCapabilities().map((capability) => capability.id).sort(),
    );
  });

  it("exposes the migration-stable set of public ids", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const ids = registry.listCapabilities().map((capability) => capability.id).sort();

    expect(ids).toEqual([...PUBLIC_IDS].sort());
  });

  it("exposes NocoDB as a composite skill + mcp capability", async () => {
    const registry = new SnapshotCapabilityRegistry(
      (await FileSystemCapabilityRegistry.scan(CATALOG_ROOT)).listCapabilities(),
    );

    expect(registry.getCapability("nocodb")).toMatchObject({
      namespace: "local",
      slug: "nocodb",
      components: { skill: true, mcp: true },
    });
    expect(registry.listUpstreamMcpServers().some((server) => server.capabilityId === "nocodb")).toBe(true);
  });

  it("keeps upstream MCP URIs stable for a moved capability", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(CATALOG_ROOT);
    const snapshot = new SnapshotCapabilityRegistry(registry.listCapabilities());

    // Filesystem move must not leak into public URIs.
    expect(snapshot.readResource("skill://nocodb/SKILL.md")).toBeDefined();
    expect(snapshot.readResource("skill://nocodb/mcp.json")).toBeDefined();
  });

  it("searches id, namespace and slug as discovery signals", async () => {
    const registry = new SnapshotCapabilityRegistry(
      (await FileSystemCapabilityRegistry.scan(CATALOG_ROOT)).listCapabilities(),
    );

    // slug within a namespace, found without knowing the namespace:
    const hits = registry.search("improve ui", { limit: 20 });
    expect(hits.some((hit) => hit.capabilityId === "ui-skills-improve-ui")).toBe(true);
  });
});