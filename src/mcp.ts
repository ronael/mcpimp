import type { CapabilityRegistry } from "./types";

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: any;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
  };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

const SERVER_INFO = {
  name: "personal-capability-registry",
  version: "1.0.0",
};

const TOOLS = [
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
];

function success(id: JsonRpcId, result: any): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

function failure(id: JsonRpcId, code: number, message: string): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

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

function callTool(registry: CapabilityRegistry, name: string, args: Record<string, unknown> = {}) {
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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export function createMcpHandler(registry: CapabilityRegistry) {
  return async function handleMcpMessage(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request.id ?? null;

    try {
      switch (request.method) {
        case "initialize":
          return success(id, {
            protocolVersion: "2025-03-26",
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: SERVER_INFO,
          });
        case "notifications/initialized":
          return success(id, null);
        case "tools/list":
          return success(id, { tools: TOOLS });
        case "tools/call": {
          const params = request.params || {};
          const toolName = params.name;
          if (typeof toolName !== "string") throw new Error("Missing tool name");

          return success(id, callTool(registry, toolName, (params.arguments as Record<string, unknown>) || {}));
        }
        case "resources/list":
          return success(id, { resources: registry.listResources() });
        case "resources/read": {
          const params = request.params || {};
          if (typeof params.uri !== "string") throw new Error("Missing resource uri");
          const resource = registry.readResource(params.uri);

          return success(id, {
            contents: [
              {
                uri: resource.uri,
                name: resource.name,
                mimeType: resource.mimeType,
                text: resource.text,
              },
            ],
          });
        }
        default:
          return failure(id, -32601, `Unknown method: ${request.method}`);
      }
    } catch (error) {
      return failure(id, -32601, error instanceof Error ? error.message : "Unknown MCP error");
    }
  };
}
