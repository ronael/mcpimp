const INTERNAL_BASE_URL = "https://mcpimp.invalid/";
const MARKDOWN_LINK = /\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^)]*["'])?\s*\)/g;
const CODE_SPAN = /`([^`\n]+)`/g;

function resolveInternalPath(destination: string, currentPath: string): string | undefined {
  try {
    const base = new URL(currentPath, INTERNAL_BASE_URL);
    const resolved = new URL(destination, base);
    if (resolved.origin !== INTERNAL_BASE_URL.slice(0, -1)) return undefined;
    return decodeURIComponent(resolved.pathname).replace(/^\//, "");
  } catch {
    return undefined;
  }
}

/**
 * Extract only links that resolve to known files inside the same capability.
 * Imported Markdown remains untrusted: a linked path is navigation metadata,
 * never an instruction to execute or an assertion that the file is required.
 */
export function extractLinkedCapabilityPaths(
  markdown: string,
  currentPath: string,
  availablePaths: Iterable<string>,
): string[] {
  const available = new Set([...availablePaths].filter((path) => path !== currentPath));
  const positions = new Map<string, number>();

  for (const match of markdown.matchAll(CODE_SPAN)) {
    for (const path of available) {
      if (!match[1].includes(path)) continue;
      positions.set(path, Math.min(positions.get(path) ?? Number.POSITIVE_INFINITY, match.index || 0));
    }
  }

  for (const match of markdown.matchAll(MARKDOWN_LINK)) {
    const path = resolveInternalPath(match[1], currentPath);
    if (!path || !available.has(path)) continue;
    positions.set(path, Math.min(positions.get(path) ?? Number.POSITIVE_INFINITY, match.index || 0));
  }

  return [...positions]
    .sort(([leftPath, leftIndex], [rightPath, rightIndex]) => leftIndex - rightIndex || leftPath.localeCompare(rightPath))
    .map(([path]) => path);
}
