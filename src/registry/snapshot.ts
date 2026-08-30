import { searchCapabilities } from "./search";
import { CapabilityResourceNotFoundError } from "./types";
import type {
  Capability,
  CapabilityFile,
  CapabilityUpstreamMcp,
  CapabilityRegistry,
  CapabilityResource,
  CapabilitySearchOptions,
  CapabilitySearchResult,
} from "./types";

/**
 * Registry backed by the build-time snapshot, used by the Cloudflare Worker where
 * there is no filesystem. Behaviour must stay identical to the filesystem
 * registry: both delegate search to the same module.
 */
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
      capability.files
        .filter((file) => !file.binary)
        .map((file) => ({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          description: `${capability.name}: ${file.path}`,
        })),
    );
  }

  readResource(uri: string): CapabilityFile {
    const file = this.capabilities.flatMap((capability) => capability.files).find((item) => item.uri === uri);
    if (!file) throw new CapabilityResourceNotFoundError(uri);
    if (file.binary) {
      throw new Error(
        `Binary resource is not readable as text: ${uri} (${file.bytes} bytes, ${file.mimeType}, sha256 ${file.sha256})`,
      );
    }
    return file;
  }

  search(query: string, options?: CapabilitySearchOptions): CapabilitySearchResult[] {
    return searchCapabilities(this.capabilities, query, options);
  }
}
