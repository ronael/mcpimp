import type {
  Capability,
  CapabilityFile,
  CapabilityUpstreamMcp,
  CapabilityRegistry,
  CapabilityResource,
  CapabilitySearchResult,
} from "./types";

export class SnapshotCapabilityRegistry implements CapabilityRegistry {
  constructor(private readonly capabilities: Capability[]) {}

  listCapabilities(): Capability[] {
    return this.capabilities.map((capability) => ({
      ...capability,
      files: [...capability.files],
    }));
  }

  getCapability(id: string): Capability | undefined {
    const capability = this.capabilities.find((item) => item.id === id);
    if (!capability) return undefined;
    return { ...capability, files: [...capability.files] };
  }

  listUpstreamMcpServers(): CapabilityUpstreamMcp[] {
    return this.capabilities
      .filter((capability) => capability.mcp)
      .map((capability) => ({
        capabilityId: capability.id,
        capabilityName: capability.name,
        config: capability.mcp!,
      }));
  }

  listResources(): CapabilityResource[] {
    return this.capabilities.flatMap((capability) =>
      capability.files.map((file) => ({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        description: `${capability.name}: ${file.path}`,
      })),
    );
  }

  readResource(uri: string): CapabilityFile {
    const file = this.capabilities.flatMap((capability) => capability.files).find((item) => item.uri === uri);
    if (!file) throw new Error(`Resource not found: ${uri}`);
    return file;
  }

  search(query: string): CapabilitySearchResult[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return this.capabilities.flatMap((capability) =>
      capability.files
        .filter((file) => file.mimeType.startsWith("text/"))
        .filter((file) => file.text.toLowerCase().includes(normalizedQuery))
        .map((file) => ({
          capabilityId: capability.id,
          capabilityName: capability.name,
          path: file.path,
          uri: file.uri,
          title: file.path.split("/").at(-1) || file.path,
          snippet:
            file.text
              .split("\n")
              .find((line) => line.toLowerCase().includes(normalizedQuery))
              ?.trim() || "",
        })),
    );
  }
}
