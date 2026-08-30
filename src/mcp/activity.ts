import type { JsonRpcRequest, JsonRpcResponse } from "./protocol";

export type McpTransport = "http" | "sse" | "upstream";
export type McpActivityStatus = "success" | "error";

export interface McpActivityError {
  code: number;
  message: string;
}

export interface McpActivityResult {
  kind: string;
  itemCount?: number;
  blockCount?: number;
  contentTypes?: string[];
  textCharacters?: number;
}

export interface McpActivityEvent {
  id: string;
  correlationId?: string;
  timestamp: string;
  transport: McpTransport;
  client: string;
  method: string;
  target?: string;
  status: McpActivityStatus;
  durationMs: number;
  requestId?: string | number | null;
  sessionId?: string;
  upstream?: {
    capabilityId: string;
    tool: string;
  };
  parameters?: Record<string, unknown>;
  result?: McpActivityResult;
  error?: McpActivityError;
}

export type NewMcpActivityEvent = Omit<McpActivityEvent, "id" | "timestamp">;

export interface McpActivityQuery {
  limit?: number;
  client?: string;
  method?: string;
  tool?: string;
  status?: McpActivityStatus;
  transport?: McpTransport;
  from?: string;
  to?: string;
}

export interface McpActivityFacets {
  clients: string[];
  methods: string[];
  tools: string[];
  statuses: McpActivityStatus[];
  transports: McpTransport[];
}

export class McpActivityLog {
  readonly #events: McpActivityEvent[] = [];

  constructor(
    private readonly maxEvents = 200,
    private readonly onEvent?: (event: McpActivityEvent) => void,
    private readonly now: () => Date = () => new Date(),
  ) {}

  record(input: NewMcpActivityEvent): McpActivityEvent {
    const event: McpActivityEvent = {
      ...input,
      id: crypto.randomUUID(),
      timestamp: this.now().toISOString(),
    };

    this.#events.push(event);
    if (this.#events.length > this.maxEvents) {
      this.#events.splice(0, this.#events.length - this.maxEvents);
    }
    this.onEvent?.(event);
    return event;
  }

  list(limit = 100): McpActivityEvent[] {
    const safeLimit = Math.max(1, Math.min(limit, this.maxEvents));
    return this.#events.slice(-safeLimit).reverse();
  }

  query(query: McpActivityQuery = {}): McpActivityEvent[] {
    const from = query.from ? Date.parse(query.from) : undefined;
    const to = query.to ? Date.parse(query.to) : undefined;
    const safeLimit = Math.max(1, Math.min(query.limit ?? 100, this.maxEvents));

    return this.#events
      .filter((event) => !query.client || event.client === query.client)
      .filter((event) => !query.method || event.method === query.method)
      .filter((event) => !query.tool || event.target === query.tool)
      .filter((event) => !query.status || event.status === query.status)
      .filter((event) => !query.transport || event.transport === query.transport)
      .filter((event) => from === undefined || Date.parse(event.timestamp) >= from)
      .filter((event) => to === undefined || Date.parse(event.timestamp) <= to)
      .slice(-safeLimit)
      .reverse();
  }

  facets(): McpActivityFacets {
    const unique = <T extends string>(values: T[]) => [...new Set(values)].sort() as T[];
    return {
      clients: unique(this.#events.map((event) => event.client)),
      methods: unique(this.#events.map((event) => event.method)),
      tools: unique(this.#events.flatMap((event) => event.target ? [event.target] : [])),
      statuses: unique(this.#events.map((event) => event.status)),
      transports: unique(this.#events.map((event) => event.transport)),
    };
  }
}

export function activityTarget(request: { method: string; params?: Record<string, unknown> }): string | undefined {
  if (request.method === "tools/call") {
    return typeof request.params?.name === "string" ? request.params.name : undefined;
  }
  if (request.method === "resources/read") {
    return typeof request.params?.uri === "string" ? request.params.uri : undefined;
  }
  return undefined;
}

export function activityUpstream(
  request: { method: string; params?: Record<string, unknown> },
): McpActivityEvent["upstream"] | undefined {
  if (request.method !== "tools/call" || typeof request.params?.name !== "string") return undefined;
  const separator = request.params.name.indexOf(".");
  if (separator < 1 || separator === request.params.name.length - 1) return undefined;
  return {
    capabilityId: request.params.name.slice(0, separator),
    tool: request.params.name.slice(separator + 1),
  };
}

export function activityClient(request: { method: string; params?: Record<string, unknown> }, userAgent?: string): string {
  if (request.method === "initialize") {
    const clientInfo = request.params?.clientInfo;
    if (clientInfo && typeof clientInfo === "object") {
      const { name, version } = clientInfo as { name?: unknown; version?: unknown };
      if (typeof name === "string") {
        return typeof version === "string" ? `${name} ${version}` : name;
      }
    }
  }
  return userAgent?.trim() || "unknown client";
}

const INTERNAL_TOOLS = new Set([
  "list-capabilities",
  "capability-info",
  "load-capability",
  "search-capabilities",
  "list-upstreams",
]);
const SENSITIVE_KEY = /authorization|cookie|credential|password|secret|token|api[-_]?key/i;
const INTERNAL_ARGUMENTS: Record<string, string[]> = {
  "list-capabilities": [],
  "capability-info": ["id", "path", "query", "headingLimit", "diagnostic"],
  "load-capability": ["id", "section", "path", "heading"],
  "search-capabilities": ["query", "limit", "capabilityId"],
  "list-upstreams": [],
};

function truncate(value: string, maxLength = 500): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

function redactText(value: string): string {
  return truncate(value)
    .replace(/\b(Bearer)\s+\S+/gi, "$1 [REDACTED]")
    .replace(/((?:api[-_]?key|token|secret|password)\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]");
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return truncate(value);
  if (depth >= 3) return "[MAX_DEPTH]";
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value !== "object") return typeof value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitizeValue(item, depth + 1)]),
  );
}

function describeArguments(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const fields = Object.entries(value as Record<string, unknown>)
    .slice(0, 20)
    .map(([name, item]) => ({ name, type: Array.isArray(item) ? "array" : item === null ? "null" : typeof item }));
  return fields.length > 0 ? { fields } : undefined;
}

function sanitizeInternalArguments(name: string, value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const argumentsRecord = value as Record<string, unknown>;
  const entries = INTERNAL_ARGUMENTS[name]
    .filter((key) => Object.prototype.hasOwnProperty.call(argumentsRecord, key))
    .map((key) => [key, sanitizeValue(argumentsRecord[key])] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function activityParameters(request: JsonRpcRequest): Record<string, unknown> | undefined {
  if (request.method === "initialize") {
    const params = request.params || {};
    return sanitizeValue({ protocolVersion: params.protocolVersion, clientInfo: params.clientInfo }) as Record<string, unknown>;
  }
  if (request.method === "tools/call") {
    const name = request.params?.name;
    const args = request.params?.arguments;
    if (typeof name === "string" && INTERNAL_TOOLS.has(name)) {
      return sanitizeInternalArguments(name, args);
    }
    return describeArguments(args);
  }
  if (request.method === "notifications/cancelled") {
    const requestId = request.params?.requestId;
    const reason = request.params?.reason;
    return {
      ...(typeof requestId === "string" || typeof requestId === "number" ? { requestId } : {}),
      hasReason: typeof reason === "string" && reason.length > 0,
    };
  }
  if (request.method === "resources/read" && typeof request.params?.uri === "string") {
    return { uri: truncate(request.params.uri) };
  }
  return undefined;
}

function contentSummary(content: unknown): Omit<McpActivityResult, "kind"> {
  if (!Array.isArray(content)) return {};
  const contentTypes = [...new Set(content.map((block) => {
    if (!block || typeof block !== "object") return typeof block;
    const type = (block as Record<string, unknown>).type;
    return typeof type === "string" ? type : "unknown";
  }))];
  const textCharacters = content.reduce((total, block) => {
    if (!block || typeof block !== "object") return total;
    const text = (block as Record<string, unknown>).text;
    return total + (typeof text === "string" ? text.length : 0);
  }, 0);
  return { blockCount: content.length, contentTypes, ...(textCharacters > 0 ? { textCharacters } : {}) };
}

function returnedItemCount(request: JsonRpcRequest, content: unknown): number | undefined {
  if (request.method !== "tools/call" || !INTERNAL_TOOLS.has(String(request.params?.name)) || !Array.isArray(content)) {
    return undefined;
  }
  const first = content[0];
  if (!first || typeof first !== "object" || typeof (first as Record<string, unknown>).text !== "string") return undefined;
  try {
    const parsed = JSON.parse((first as Record<string, unknown>).text as string);
    return Array.isArray(parsed) ? parsed.length : undefined;
  } catch {
    return undefined;
  }
}

export function activityOutcome(
  request: JsonRpcRequest,
  response: JsonRpcResponse,
): { status: McpActivityStatus; result?: McpActivityResult; error?: McpActivityError } {
  if ("error" in response) {
    return {
      status: "error",
      error: { code: response.error.code, message: redactText(response.error.message) },
    };
  }

  const value = response.result;
  if (value && typeof value === "object" && (value as Record<string, unknown>).isError === true) {
    return {
      status: "error",
      result: { kind: "tool-result", ...contentSummary((value as Record<string, unknown>).content) },
      error: { code: -32000, message: "MCP tool returned an error result" },
    };
  }
  if (request.method === "tools/list" && value && typeof value === "object") {
    const tools = (value as Record<string, unknown>).tools;
    return { status: "success", result: { kind: "tools", ...(Array.isArray(tools) ? { itemCount: tools.length } : {}) } };
  }
  if (request.method === "resources/list" && value && typeof value === "object") {
    const resources = (value as Record<string, unknown>).resources;
    return { status: "success", result: { kind: "resources", ...(Array.isArray(resources) ? { itemCount: resources.length } : {}) } };
  }
  if (request.method === "resources/read" && value && typeof value === "object") {
    const contents = (value as Record<string, unknown>).contents;
    return { status: "success", result: { kind: "resource", ...contentSummary(contents) } };
  }
  if (request.method === "tools/call" && value && typeof value === "object") {
    const content = (value as Record<string, unknown>).content;
    const itemCount = returnedItemCount(request, content);
    return {
      status: "success",
      result: { kind: "tool-result", ...contentSummary(content), ...(itemCount !== undefined ? { itemCount } : {}) },
    };
  }
  return { status: "success", result: { kind: request.method === "initialize" ? "server-info" : "acknowledgement" } };
}
