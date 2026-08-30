import { CapabilityResourceNotFoundError, type CapabilityRegistry } from "../registry/types";
import { JsonRpcError, jsonRpcFailure, jsonRpcSuccess, type JsonRpcRequest, type JsonRpcResponse } from "./protocol";
import { callMcpTool, MCP_TOOLS } from "./tools";
import { UpstreamMcpGateway } from "./upstream";

export const SERVER_INFO = {
  name: "personal-capability-registry",
  version: "1.0.0",
};

export function createMcpHandler(registry: CapabilityRegistry, upstreamGateway = new UpstreamMcpGateway(registry)) {
  return async function handleMcpMessage(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request.id ?? null;

    try {
      switch (request.method) {
        case "ping":
          return jsonRpcSuccess(id, {});
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
        case "notifications/cancelled":
          // Local registry operations are currently short-lived and cannot be
          // interrupted. MCP permits ignoring unknown or completed request IDs.
          return jsonRpcSuccess(id, null);
        case "tools/list":
          return jsonRpcSuccess(id, { tools: [...MCP_TOOLS, ...(await upstreamGateway.listTools())] });
        case "tools/call": {
          const params = request.params || {};
          const toolName = params.name;
          if (typeof toolName !== "string") throw new JsonRpcError(-32602, "Missing tool name");

          if (upstreamGateway.canHandleTool(toolName)) {
            return jsonRpcSuccess(
              id,
              await upstreamGateway.callTool(toolName, (params.arguments as Record<string, unknown>) || {}),
            );
          }

          return jsonRpcSuccess(
            id,
            callMcpTool(registry, upstreamGateway, toolName, (params.arguments as Record<string, unknown>) || {}),
          );
        }
        case "resources/list":
          return jsonRpcSuccess(id, { resources: registry.listResources() });
        case "resources/templates/list":
          // MCPIMP currently exposes concrete skill:// resources only. Clients
          // may still probe this standard method when resources are advertised.
          return jsonRpcSuccess(id, { resourceTemplates: [] });
        case "resources/read": {
          const params = request.params || {};
          if (typeof params.uri !== "string") throw new JsonRpcError(-32602, "Missing resource uri");
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
      if (error instanceof JsonRpcError) {
        return jsonRpcFailure(id, error.code, error.message, error.data);
      }
      if (error instanceof CapabilityResourceNotFoundError) {
        return jsonRpcFailure(id, -32002, "Resource not found", { uri: error.uri });
      }
      return jsonRpcFailure(id, -32603, error instanceof Error ? error.message : "Internal MCP error");
    }
  };
}
