import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { FileSystemCapabilityRegistry } from "../filesystem";

const fixturesRoot = resolve("test/fixtures/capabilities");
const upstreamFixturesRoot = resolve("test/fixtures/upstream-capabilities");

describe("FileSystemCapabilityRegistry", () => {
  it("discovers local capabilities that contain a SKILL.md", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.listCapabilities()).toMatchObject([
      {
        id: "landing-page",
        name: "landing-page",
        description: "Build premium landing pages with a structured expert workflow.",
      },
    ]);
  });

  it("does not expose folders without a supported component as capabilities", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.getCapability("invalid-no-skill")).toBeUndefined();
  });

  it("lists stable resources for a capability", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.listResources().map((resource) => resource.uri)).toEqual([
      "skill://landing-page/SKILL.md",
      "skill://landing-page/README.md",
      "skill://landing-page/agents/designer.md",
      "skill://landing-page/references/source.md",
      "skill://landing-page/shared/rules.md",
    ]);
  });

  it("classifies reference markdown files explicitly", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.readResource("skill://landing-page/references/source.md")).toMatchObject({
      type: "reference",
      mimeType: "text/markdown",
    });
  });

  it("reads a resource by skill URI", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.readResource("skill://landing-page/SKILL.md")).toMatchObject({
      uri: "skill://landing-page/SKILL.md",
      name: "landing-page/SKILL.md",
      mimeType: "text/markdown",
    });
  });

  it("searches indexed markdown content across capabilities", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(fixturesRoot);

    expect(registry.search("conversion")).toMatchObject([
      {
        capabilityId: "landing-page",
        path: "shared/rules.md",
        uri: "skill://landing-page/shared/rules.md",
      },
    ]);
  });

  it("loads optional mcp.json upstream config for active capabilities", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const servers = registry.listUpstreamMcpServers();

    expect(servers).toContainEqual(
      expect.objectContaining({
        capabilityId: "nocodb",
        config: expect.objectContaining({
          type: "mcp",
          transport: "streamable-http",
          url: "env:TEST_NOCO_MCP_URL",
        }),
      }),
    );
    expect(servers).toContainEqual(
      expect.objectContaining({
        capabilityId: "mcp-only",
        config: expect.objectContaining({
          type: "mcp",
          transport: "streamable-http",
          url: "https://example.com/mcp",
        }),
      }),
    );
  });

  it("discovers a capability that only contains mcp.json", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);

    const capability = registry.getCapability("mcp-only");
    expect(capability).toMatchObject({
      id: "mcp-only",
      namespace: "local",
      slug: "mcp-only",
      components: { skill: false, mcp: true },
    });
    expect(capability?.files.map((file) => file.path)).toEqual(["mcp.json"]);
  });

  it("detects composite capabilities with both skill and mcp components", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);

    expect(registry.getCapability("nocodb")).toMatchObject({
      id: "nocodb",
      namespace: "local",
      slug: "nocodb",
      components: { skill: true, mcp: true },
    });
  });

  it("derives public ids from namespace and slug", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(resolve("catalog/capabilities"));

    expect(registry.getCapability("ui-skills-improve-ui")).toMatchObject({
      namespace: "ui-skills",
      slug: "improve-ui",
    });
    expect(registry.getCapability("matt-pocock-codebase-design")).toMatchObject({
      namespace: "matt-pocock",
      slug: "codebase-design",
    });
  });

  it("exposes local capabilities by slug only, without a local- prefix", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(resolve("catalog/capabilities"));

    expect(registry.getCapability("landing-page")).toMatchObject({
      namespace: "local",
      slug: "landing-page",
      id: "landing-page",
    });
  });

  it("reads name, description and tags from mcp.json for MCP-only capabilities", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);
    const capability = registry.getCapability("crm-connector");

    expect(capability).toMatchObject({
      id: "crm-connector",
      namespace: "local",
      slug: "crm-connector",
      components: { skill: false, mcp: true },
      name: "CRM Connector",
      description: "Connect to the CRM to read customer records and manage pipelines.",
    });
    expect(capability?.files.map((file) => file.path)).toEqual(["mcp.json"]);
  });

  it("finds an MCP-only capability by id, name and description through search", async () => {
    const registry = await FileSystemCapabilityRegistry.scan(upstreamFixturesRoot);

    expect(registry.search("crm-connector", { limit: 10 }).map((hit) => hit.capabilityId)).toContain("crm-connector");
    expect(registry.search("CRM Connector", { limit: 10 }).map((hit) => hit.capabilityId)).toContain("crm-connector");
    expect(registry.search("customer records", { limit: 10 }).map((hit) => hit.capabilityId)).toContain(
      "crm-connector",
    );
  });

  it("fails loudly when SOURCE.json identity disagrees with the folder", async () => {
    await expect(
      FileSystemCapabilityRegistry.scan(resolve("test/fixtures/mismatched-manifest")),
    ).rejects.toThrow(/SOURCE.json slug "bar" does not match folder "foo"/);
  });

  it("fails loudly when two folders map to the same public id", async () => {
    await expect(FileSystemCapabilityRegistry.scan(resolve("test/fixtures/duplicate-ids"))).rejects.toThrow(
      /Duplicate capability id "ui-skills-improve-ui" at .*local\/ui-skills-improve-ui and .*ui-skills\/improve-ui/,
    );
  });

  it("fails loudly when a synced SOURCE.json is missing its capability id", async () => {
    await expect(
      FileSystemCapabilityRegistry.scan(resolve("test/fixtures/missing-capability")),
    ).rejects.toThrow(/must declare "namespace", "slug" and "capability"/);
  });

  it("rejects an mcp.json whose optional metadata has the wrong shape", async () => {
    await expect(FileSystemCapabilityRegistry.scan(resolve("test/fixtures/invalid-mcp"))).rejects.toThrow(
      /mcp.json "name" must be a string/,
    );
  });
});
