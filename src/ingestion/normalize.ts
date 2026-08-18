import { createHash } from "node:crypto";
import { capabilityIdFor, slugify } from "../core/names";
import type { SkillKind } from "../registry/types";
import type { DiscoveredFileRef } from "./types";

/**
 * Naming, path safety and skill classification.
 *
 * Path validation is a security control, not a convenience: upstream controls the
 * strings we are about to turn into filesystem writes.
 */

const RESERVED_SEGMENTS = new Set(["", ".", "..", ".git", "node_modules"]);

export function assertSafeRelativePath(path: string): string {
  if (path.length === 0 || path.length > 400) {
    throw new Error(`Unsafe upstream path (length): ${path}`);
  }
  if (path.startsWith("/") || /^[a-zA-Z]:/.test(path) || path.includes("\\")) {
    throw new Error(`Unsafe upstream path (absolute or backslash): ${path}`);
  }
  if (path.includes("\0")) {
    throw new Error(`Unsafe upstream path (null byte): ${path}`);
  }

  for (const segment of path.split("/")) {
    if (RESERVED_SEGMENTS.has(segment)) {
      throw new Error(`Unsafe upstream path (reserved segment "${segment}"): ${path}`);
    }
  }

  return path;
}

export { capabilityIdFor, slugify };

/**
 * Deterministic identity for a skill at one revision: the sorted set of
 * `path:contentId` pairs. Lets sync decide whether anything changed without
 * downloading a single file.
 */
export function hashFileSet(files: DiscoveredFileRef[]): string {
  const lines = files
    .map((file) => `${file.path}:${file.sha || file.bytes}`)
    .sort((a, b) => a.localeCompare(b))
    .join("\n");

  return `sha256:${createHash("sha256").update(lines).digest("hex")}`;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const PLATFORM_MARKERS = [
  "${CLAUDE_PLUGIN_ROOT}",
  "CLAUDE_PLUGIN_ROOT",
  ".claude-plugin",
  "claude code plugin",
];

const SCRIPT_EXTENSIONS = new Set(["py", "sh", "bash", "js", "mjs", "cjs", "rb", "pl", "ps1"]);

export interface SkillClassification {
  kind: SkillKind;
  traits: string[];
}

/**
 * Best-effort classification of what a skill needs to run. Recorded as metadata
 * so an agent knows whether a skill is safe to use as-is; it never gates loading,
 * and it never causes anything to be executed.
 */
export function classifySkill(
  files: Pick<DiscoveredFileRef, "path" | "binary">[],
  skillText: string,
): SkillClassification {
  const traits = new Set<string>();

  for (const file of files) {
    const extension = file.path.split(".").at(-1)?.toLowerCase() || "";

    if (file.path.startsWith("references/")) traits.add("references");
    if (file.path.startsWith("data/")) traits.add("data");
    if (file.path.startsWith("assets/")) traits.add("assets");
    if (file.path.startsWith("templates/")) traits.add("templates");
    if (file.path.startsWith("scripts/") || SCRIPT_EXTENSIONS.has(extension)) traits.add("scripts");
    if (file.binary) traits.add("binaries");
  }

  const haystack = skillText.toLowerCase();
  if (PLATFORM_MARKERS.some((marker) => haystack.includes(marker.toLowerCase()))) {
    traits.add("platform-dependent");
  }

  const kind: SkillKind = traits.has("platform-dependent")
    ? "platform-specific"
    : traits.has("scripts")
      ? "executable"
      : traits.has("data") || traits.has("assets") || traits.has("binaries")
        ? "resource-dependent"
        : "portable";

  return { kind, traits: [...traits].sort() };
}
