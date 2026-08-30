import type { CapabilityRegistry } from "./types";

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Deterministic identity of the catalog content currently loaded by a registry. */
export async function catalogFingerprint(registry: CapabilityRegistry): Promise<string> {
  const capabilities = registry.listCapabilities()
    .map((capability) => ({
      id: capability.id,
      namespace: capability.namespace,
      slug: capability.slug,
      name: capability.name,
      description: capability.description,
      tags: [...(capability.tags || [])].sort(),
      components: capability.components,
      originContentHash: capability.origin?.contentHash,
      files: capability.files
        .map((file) => ({
          path: file.path,
          bytes: file.bytes,
          sha256: file.sha256,
          text: file.text,
        }))
        .sort((left, right) => left.path.localeCompare(right.path)),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(capabilities)));
  return `sha256:${hex(digest)}`;
}
