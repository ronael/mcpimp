import type { CapabilityRegistry } from "../registry/types";
import { jsonRpcFailure, jsonRpcSuccess, type JsonRpcRequest, type JsonRpcResponse } from "./protocol";
import { callMcpTool, MCP_TOOLS } from "./tools";

const SERVER_INFO = {
  name: "personal-capability-registry",
  version: "1.0.0",
};

export function createMcpHandler(registry: CapabilityRegistry) {
  return async function handleMcpMessage(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request.id ?? null;

    try {
      switch (request.method) {
        case "initialize":
          return jsonRpcSuccess(id, {
            protocolVersion: "2025-03-26",
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: SERVER_INFO,
          });
        case "notifications/initialized":
          return jsonRpcSuccess(id, null);
        case "tools/list":
          return jsonRpcSuccess(id, { tools: MCP_TOOLS });
        case "tools/call": {
          const params = request.params || {};
          const toolName = params.name;
          if (typeof toolName !== "string") throw new Error("Missing tool name");

          return jsonRpcSuccess(id, callMcpTool(registry, toolName, (params.arguments as Record<string, unknown>) || {}));
        }
        case "resources/list":
          return jsonRpcSuccess(id, { resources: registry.listResources() });
        case "resources/read": {
          const params = request.params || {};
          if (typeof params.uri !== "string") throw new Error("Missing resource uri");
          const resource = registry.readResource(params.uri);

          return jsonRpcSuccess(id, {
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
          return jsonRpcFailure(id, -32601, `Unknown method: ${request.method}`);
      }
    } catch (error) {
      return jsonRpcFailure(id, -32601, error instanceof Error ? error.message : "Unknown MCP error");
    }
  };
}
