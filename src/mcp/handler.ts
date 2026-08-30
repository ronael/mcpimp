import { CapabilityResourceNotFoundError, type CapabilityRegistry } from "../registry/types";
import { JsonRpcError, jsonRpcFailure, jsonRpcSuccess, type JsonRpcRequest, type JsonRpcResponse } from "./protocol";
import { callMcpTool, MCP_TOOLS } from "./tools";
import { UpstreamMcpGateway } from "./upstream";

export const SERVER_INFO = {
  name: "personal-capability-registry",
  version: "1.0.0",
};

export const LEGACY_PROTOCOL_VERSION = "2025-11-25";
export const MODERN_PROTOCOL_VERSION = "2026-07-28";
export const SUPPORTED_PROTOCOL_VERSIONS = [MODERN_PROTOCOL_VERSION, LEGACY_PROTOCOL_VERSION] as const;
const CACHE_TTL_MS = 60_000;
const SERVER_CAPABILITIES = { tools: {}, resources: {} };

export const SERVER_INSTRUCTIONS = [
  "MCPIMP is the capability router for this agent.",
  "Before a non-trivial coding, architecture, design, audit, research, or integration task, call resolve-capabilities with the complete task and available project context.",
  "Use one primary capability and at most two supporting capabilities, then load only the returned entrypoints needed for the task.",
  "Project and user instructions always take precedence over capability guidance.",
].join(" ");

function requestProtocolVersion(request: JsonRpcRequest): string | undefined {
  const metadata = request.params?._meta;
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const version = (metadata as Record<string, unknown>)["io.modelcontextprotocol/protocolVersion"];
  return typeof version === "string" ? version : undefined;
}

function modernResult(result: Record<string, unknown>, cacheable = false): Record<string, unknown> {
  return {
    ...result,
    resultType: "complete",
    _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
    ...(cacheable ? { ttlMs: CACHE_TTL_MS, cacheScope: "private" } : {}),
  };
}

function resultFor(request: JsonRpcRequest, result: Record<string, unknown>, cacheable = false) {
  return requestProtocolVersion(request) === MODERN_PROTOCOL_VERSION
    ? modernResult(result, cacheable)
    : result;
}

export function createMcpHandler(registry: CapabilityRegistry, upstreamGateway = new UpstreamMcpGateway(registry)) {
  return async function handleMcpMessage(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = request.id ?? null;

    try {
      switch (request.method) {
        case "ping":
          return jsonRpcSuccess(id, resultFor(request, {}));
        case "initialize":
          return jsonRpcSuccess(id, {
            protocolVersion: typeof request.params?.protocolVersion === "string"
              && request.params.protocolVersion.startsWith("2025-")
              ? request.params.protocolVersion
              : LEGACY_PROTOCOL_VERSION,
            capabilities: SERVER_CAPABILITIES,
            serverInfo: SERVER_INFO,
            instructions: SERVER_INSTRUCTIONS,
          });
        case "server/discover":
          return jsonRpcSuccess(id, modernResult({
            supportedVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
            capabilities: SERVER_CAPABILITIES,
            instructions: SERVER_INSTRUCTIONS,
          }, true));
        case "notifications/initialized":
          return jsonRpcSuccess(id, null);
        case "notifications/cancelled":
          // Local registry operations are currently short-lived and cannot be
          // interrupted. MCP permits ignoring unknown or completed request IDs.
          return jsonRpcSuccess(id, null);
        case "tools/list":
          return jsonRpcSuccess(id, resultFor(
            request,
            { tools: [...MCP_TOOLS, ...(await upstreamGateway.listTools())] },
            true,
          ));
        case "tools/call": {
          const params = request.params || {};
          const toolName = params.name;
          if (typeof toolName !== "string") throw new JsonRpcError(-32602, "Missing tool name");

          if (upstreamGateway.canHandleTool(toolName)) {
            return jsonRpcSuccess(
              id,
              resultFor(
                request,
                await upstreamGateway.callTool(toolName, (params.arguments as Record<string, unknown>) || {}),
              ),
            );
          }

          return jsonRpcSuccess(
            id,
            resultFor(
              request,
              callMcpTool(registry, upstreamGateway, toolName, (params.arguments as Record<string, unknown>) || {}),
            ),
          );
        }
        case "resources/list":
          return jsonRpcSuccess(id, resultFor(request, { resources: registry.listResources() }, true));
        case "resources/templates/list":
          // MCPIMP currently exposes concrete skill:// resources only. Clients
          // may still probe this standard method when resources are advertised.
          return jsonRpcSuccess(id, resultFor(request, { resourceTemplates: [] }, true));
        case "resources/read": {
          const params = request.params || {};
          if (typeof params.uri !== "string") throw new JsonRpcError(-32602, "Missing resource uri");
          const resource = registry.readResource(params.uri);

          return jsonRpcSuccess(id, resultFor(request, {
            contents: [
              {
                uri: resource.uri,
                name: resource.name,
                mimeType: resource.mimeType,
                text: resource.text,
              },
            ],
          }, true));
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
