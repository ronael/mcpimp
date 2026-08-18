import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { SourceDefinition } from "./types";

/** Folder holding one JSON file per registered external source, relative to the capabilities root. */
export const SOURCES_DIR = "catalog/sources";

function assertString(value: unknown, field: string, file: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${file}: "${field}" must be a non-empty string`);
  }
  return value;
}

function assertStringArray(value: unknown, field: string, file: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${file}: "${field}" must be an array of strings`);
  }
  return value as string[];
}

export function parseSourceDefinition(raw: unknown, file: string): SourceDefinition {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${file}: source definition must be an object`);
  }

  const record = raw as Record<string, unknown>;
  const id = assertString(record.id, "id", file);
  const type = assertString(record.type, "type", file);
  const update = record.update;

  if (update !== undefined && update !== "manual" && update !== "review" && update !== "auto") {
    throw new Error(`${file}: "update" must be one of manual, review, auto`);
  }

  const shared = {
    id,
    update: update as SourceDefinition["update"],
    namespace: record.namespace === undefined ? undefined : assertString(record.namespace, "namespace", file),
    include: assertStringArray(record.include, "include", file),
    exclude: assertStringArray(record.exclude, "exclude", file),
    maxFileBytes: typeof record.maxFileBytes === "number" ? record.maxFileBytes : undefined,
    maxFiles: typeof record.maxFiles === "number" ? record.maxFiles : undefined,
    downloadBinaries: record.downloadBinaries === true,
    notes: typeof record.notes === "string" ? record.notes : undefined,
  };

  if (type === "github") {
    return {
      ...shared,
      type: "github",
      repository: assertString(record.repository, "repository", file),
      ref: record.ref === undefined ? undefined : assertString(record.ref, "ref", file),
      roots: assertStringArray(record.roots, "roots", file),
    };
  }

  if (type === "web-catalog") {
    return {
      ...shared,
      type: "web-catalog",
      url: assertString(record.url, "url", file),
      allowedRepositories: assertStringArray(record.allowedRepositories, "allowedRepositories", file),
      roots: assertStringArray(record.roots, "roots", file),
    };
  }

  throw new Error(`${file}: unknown source type "${type}"`);
}

export async function loadSourceDefinitions(root: string): Promise<SourceDefinition[]> {
  const dir = join(root, SOURCES_DIR);
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  const definitions: SourceDefinition[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

    const file = join(dir, entry.name);
    const raw = await readFile(file, "utf-8");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`${file}: invalid JSON`);
    }

    const definition = parseSourceDefinition(parsed, entry.name);
    if (definition.id !== basename(entry.name, ".json")) {
      throw new Error(`${entry.name}: "id" must match the filename (${definition.id})`);
    }
    if (definitions.some((existing) => existing.id === definition.id)) {
      throw new Error(`${entry.name}: duplicate source id "${definition.id}"`);
    }

    definitions.push(definition);
  }

  return definitions;
}
