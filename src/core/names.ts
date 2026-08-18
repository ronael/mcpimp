const RESERVED_SEGMENTS = new Set(["", ".", "..", ".git", "node_modules"]);

/** Turn any string into a URL/filesystem safe slug. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Public stable capability id from namespace and slug.
 *
 * - local capabilities expose their slug directly (`local/landing-page` → `landing-page`)
 * - synced capabilities prefix the slug with the namespace unless the slug already
 *   carries it (`ui-skills/improve-ui` → `ui-skills-improve-ui`)
 */
export function capabilityIdFor(namespace: string, slug: string): string {
  const cleanNamespace = slugify(namespace);
  const cleanSlug = slugify(slug);

  if (!cleanNamespace || cleanNamespace === "local") return cleanSlug;
  if (cleanSlug === cleanNamespace || cleanSlug.startsWith(`${cleanNamespace}-`)) return cleanSlug;
  return `${cleanNamespace}-${cleanSlug}`;
}

/** Validate a single namespace or slug segment. */
export function assertSafeSegment(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 64) {
    throw new Error(`Unsafe ${field} (length): ${value}`);
  }
  if (normalized.startsWith("/") || normalized.includes("\\") || normalized.includes("\0") || normalized.includes("/")) {
    throw new Error(`Unsafe ${field} (path characters): ${value}`);
  }
  for (const segment of normalized.split("/")) {
    if (RESERVED_SEGMENTS.has(segment)) {
      throw new Error(`Unsafe ${field} (reserved segment "${segment}"): ${value}`);
    }
  }
  return normalized;
}
