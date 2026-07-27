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
  listResources(): CapabilityResource[];
  readResource(uri: string): CapabilityFile;
  search(query: string): CapabilitySearchResult[];
}
