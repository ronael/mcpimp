import type { CapabilityRegistry } from "../registry/types";
import type { UpstreamMcpGateway } from "./upstream";

export const MCP_TOOLS = [
  {
    name: "list-capabilities",
    description: "List all capabilities available in the registry.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "capability-info",
    description: "Get metadata and indexed files for one capability.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Capability id." },
      },
      required: ["id"],
    },
  },
  {
    name: "load-capability",
    description: "Load a capability as concatenated Markdown content.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Capability id." },
        section: {
          type: "string",
          enum: ["full", "skill", "agents", "shared"],
          default: "full",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "search-capabilities",
    description: "Search across indexed capability text files.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
      },
      required: ["query"],
    },
  },
  {
    name: "list-upstreams",
    description: "List configured upstream MCP servers and their readiness status.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

function textContent(value: unknown) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required string argument: ${key}`);
  }
  return value;
}

function summarizeCapability(registry: CapabilityRegistry, id: string) {
  const capability = registry.getCapability(id);
  if (!capability) throw new Error(`Capability not found: ${id}`);

  return {
    id: capability.id,
    name: capability.name,
    description: capability.description,
    files: capability.files.map((file) => ({
      path: file.path,
      uri: file.uri,
      type: file.type,
      lines: file.lines,
    })),
  };
}

function loadCapability(registry: CapabilityRegistry, args: Record<string, unknown>) {
  const id = requireString(args, "id");
  const section = typeof args.section === "string" ? args.section : "full";
  const capability = registry.getCapability(id);
  if (!capability) throw new Error(`Capability not found: ${id}`);

  const files = capability.files.filter((file) => {
    if (section === "full") return file.mimeType.startsWith("text/");
    if (section === "skill") return file.type === "skill";
    if (section === "agents") return file.type === "agent";
    if (section === "shared") return file.type === "shared";
    throw new Error(`Unknown section: ${section}`);
  });

  return files.map((file) => `<!-- ${file.path} -->\n\n${file.text}`).join("\n\n");
}

export function callMcpTool(
  registry: CapabilityRegistry,
  upstreamGateway: UpstreamMcpGateway,
  name: string,
  args: Record<string, unknown> = {},
) {
  switch (name) {
    case "list-capabilities":
      return textContent(
        registry.listCapabilities().map((capability) => ({
          id: capability.id,
          name: capability.name,
          description: capability.description,
          files: capability.files.length,
        })),
      );
    case "capability-info":
      return textContent(summarizeCapability(registry, requireString(args, "id")));
    case "load-capability":
      return textContent(loadCapability(registry, args));
    case "search-capabilities":
      return textContent(registry.search(requireString(args, "query")));
    case "list-upstreams":
      return textContent(upstreamGateway.listUpstreams());
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
