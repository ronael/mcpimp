/** Central filesystem paths used across MCPIMP. All paths are relative to the project root. */

/** Declared external sources, one JSON file per source. */
export const SOURCES_DIR = "catalog/sources";

/** Root of the capability catalog. */
export const CAPABILITIES_DIR = "catalog/capabilities";

/** Reserved namespace for manually created capabilities. */
export const LOCAL_NAMESPACE = "local";

/** Generated build artifacts. */
export const GENERATED_DIR = "generated";

/** Snapshot bundled into the Cloudflare Worker. */
export const CAPABILITY_SNAPSHOT_FILE = "generated/capability-snapshot.ts";
