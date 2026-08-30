import type {
  Capability,
  CapabilityRoutingCard,
  CapabilityRoutingRole,
  CapabilityTaskMode,
} from "./types";

export const ROUTING_FILE = "ROUTING.json";

const TASK_MODES = new Set<CapabilityTaskMode>(["create", "redesign", "audit", "fix", "review", "research", "integrate"]);
const ROLES = new Set<CapabilityRoutingRole>(["orchestrator", "specialist", "generalist", "resource", "connector"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${ROUTING_FILE} "${field}" must be an array of non-empty strings`);
  }
  return [...new Set(value.map((item) => item.trim()))];
}

export function parseRoutingCard(text: string, capabilityId: string): CapabilityRoutingCard {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`Invalid ${ROUTING_FILE} for ${capabilityId}`);
  }
  if (!isRecord(value)) throw new Error(`${ROUTING_FILE} for ${capabilityId} must be an object`);
  if (value.schemaVersion !== 1) throw new Error(`${ROUTING_FILE} for ${capabilityId} requires schemaVersion 1`);
  if (typeof value.role !== "string" || !ROLES.has(value.role as CapabilityRoutingRole)) {
    throw new Error(`${ROUTING_FILE} for ${capabilityId} has an invalid role`);
  }
  const taskModes = stringList(value.taskModes, "taskModes");
  if (taskModes.some((mode) => !TASK_MODES.has(mode as CapabilityTaskMode))) {
    throw new Error(`${ROUTING_FILE} for ${capabilityId} has an invalid taskMode`);
  }
  return {
    schemaVersion: 1,
    role: value.role as CapabilityRoutingRole,
    taskModes: taskModes as CapabilityTaskMode[],
    useWhen: stringList(value.useWhen, "useWhen"),
    avoidWhen: stringList(value.avoidWhen, "avoidWhen"),
    conflictsWith: stringList(value.conflictsWith, "conflictsWith"),
    complements: stringList(value.complements, "complements"),
  };
}

export function validateRoutingReferences(capabilities: Capability[]): void {
  const ids = new Set(capabilities.map((capability) => capability.id));
  for (const capability of capabilities) {
    const routing = capability.routing;
    if (!routing) continue;
    for (const [field, references] of [
      ["conflictsWith", routing.conflictsWith],
      ["complements", routing.complements],
    ] as const) {
      for (const reference of references) {
        if (reference === capability.id) throw new Error(`${ROUTING_FILE} for ${capability.id} cannot reference itself in ${field}`);
        if (!ids.has(reference)) throw new Error(`${ROUTING_FILE} for ${capability.id} references unknown capability "${reference}" in ${field}`);
      }
    }
  }
}
