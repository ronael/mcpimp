export type CapabilityFileType =
  | "skill"
  | "agent"
  | "shared"
  | "readme"
  | "bundle"
  | "asset"
  | "script"
  | "other";

export interface CapabilityFile {
  capabilityId: string;
  path: string;
  uri: string;
  name: string;
  type: CapabilityFileType;
  mimeType: string;
  text: string;
  lines: number;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  rootPath?: string;
  files: CapabilityFile[];
  mcp?: CapabilityMcpConfig;
}

export interface CapabilityMcpConfig {
  type: "mcp";
  transport: "streamable-http";
  url: string;
  enabled?: boolean;
  headers?: Record<string, string>;
}

export interface CapabilityResource {
  uri: string;
  name: string;
  mimeType: string;
  description?: string;
}

export interface CapabilitySearchResult {
  capabilityId: string;
  capabilityName: string;
  path: string;
  uri: string;
  title: string;
  snippet: string;
}

export interface CapabilityRegistry {
  listCapabilities(): Capability[];
  getCapability(id: string): Capability | undefined;
  listUpstreamMcpServers(): CapabilityUpstreamMcp[];
  listResources(): CapabilityResource[];
  readResource(uri: string): CapabilityFile;
  search(query: string): CapabilitySearchResult[];
}

export interface CapabilityUpstreamMcp {
  capabilityId: string;
  capabilityName: string;
  config: CapabilityMcpConfig;
}
